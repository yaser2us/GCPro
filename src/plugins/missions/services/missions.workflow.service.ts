import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { OutboxService } from '../../../corekit/services/outbox.service';
import { MissionDefinitionRepository } from '../repositories/mission-definition.repo';
import { MissionAssignmentRepository } from '../repositories/mission-assignment.repo';
import { MissionSubmissionRepository } from '../repositories/mission-submission.repo';
import { MissionRewardGrantRepository } from '../repositories/mission-reward-grant.repo';
import { MissionDefinitionCreateRequestDto } from '../dto/mission-definition-create.request.dto';
import { MissionDefinitionPublishRequestDto } from '../dto/mission-definition-publish.request.dto';
import { MissionAssignRequestDto } from '../dto/mission-assign.request.dto';
import { MissionSubmitRequestDto } from '../dto/mission-submit.request.dto';
import { MissionApproveSubmissionRequestDto } from '../dto/mission-approve-submission.request.dto';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * Mission Workflow Service
 * Implements mission commands following the workflow discipline:
 * Guard → Validate → Write → Emit → Commit
 *
 * Based on specs/mission/mission.pillar.yml
 */
@Injectable()
export class MissionsWorkflowService {
  constructor(
    private readonly txService: TransactionService,
    private readonly outboxService: OutboxService,
    private readonly missionDefRepo: MissionDefinitionRepository,
    private readonly assignmentRepo: MissionAssignmentRepository,
    private readonly submissionRepo: MissionSubmissionRepository,
    private readonly rewardGrantRepo: MissionRewardGrantRepository,
  ) {}

  /**
   * MISSION DEFINITION.PUBLISH COMMAND
   * Source: specs/mission/mission.pillar.yml lines 178-208
   *
   * HTTP: POST /v1/missions/definitions/{id}/publish
   * Idempotency: Via Idempotency-Key header
   *
   * Flow:
   * 1. Load: mission_definition by id
   * 2. Guard: status in ['draft', 'paused']
   * 3. Write: update status='published', published_at=now()
   * 4. Emit: MISSION_DEFINITION_PUBLISHED event
   */
  async publishMissionDefinition(
    id: number,
    request: MissionDefinitionPublishRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    // Transaction wrapper (line 192)
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: mission_definition (lines 184-187)
      const defn = await this.missionDefRepo.findById(id, queryRunner);
      if (!defn) {
        throw new NotFoundException({
          code: 'MISSION_DEFINITION_NOT_FOUND',
          message: `Mission definition with id ${id} not found`,
        });
      }

      // GUARD: status in ['draft', 'paused'] (lines 188-190)
      if (defn.status !== 'draft' && defn.status !== 'paused') {
        throw new ConflictException({
          code: 'MISSION_DEFINITION_NOT_PUBLISHABLE',
          message: `Cannot publish mission in status: ${defn.status}`,
        });
      }

      // WRITE: update mission_definition (lines 193-199)
      await this.missionDefRepo.update(
        id,
        {
          status: 'published',
        },
        queryRunner,
      );

      // EMIT: MISSION_DEFINITION_PUBLISHED event (lines 200-205)
      await this.outboxService.enqueue(
        {
          event_name: 'MISSION_DEFINITION_PUBLISHED',
          event_version: 1,
          aggregate_type: 'MISSION_DEFINITION',
          aggregate_id: String(id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `publish-${id}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-publish-${id}`,
          payload: { id },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      // Response (lines 206-208)
      return {
        id,
        status: 'published',
      };
    });

    return result;
  }

  /**
   * MISSION.APPROVE SUBMISSION COMMAND
   * Source: specs/mission/mission.pillar.yml lines 349-456
   *
   * HTTP: POST /v1/missions/submissions/{submission_id}/approve
   * Idempotency: Via Idempotency-Key header
   *
   * Flow:
   * 1. Load: submission, assignment, definition, existing_grant
   * 2. Guard: submission.status == 'pending'
   * 3. Write: update submission, update assignment, create reward_grant (if new)
   * 4. Emit: 3 events (SUBMISSION_APPROVED, COMPLETED, REWARD_REQUESTED)
   */
  async approveSubmission(
    submission_id: number,
    request: MissionApproveSubmissionRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    // Transaction wrapper (line 373)
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: submission (lines 355-358)
      const sub = await this.submissionRepo.findById(submission_id, queryRunner);
      if (!sub) {
        throw new NotFoundException({
          code: 'SUBMISSION_NOT_FOUND',
          message: `Submission ${submission_id} not found`,
        });
      }

      // LOAD: assignment (lines 359-361)
      const asg = await this.assignmentRepo.findById(sub.assignment_id, queryRunner);
      if (!asg) {
        throw new NotFoundException({
          code: 'ASSIGNMENT_NOT_FOUND',
          message: `Assignment ${sub.assignment_id} not found`,
        });
      }

      // LOAD: definition (lines 362-364)
      const defn = await this.missionDefRepo.findById(asg.mission_id, queryRunner);
      if (!defn) {
        throw new NotFoundException({
          code: 'MISSION_DEFINITION_NOT_FOUND',
          message: `Mission definition ${asg.mission_id} not found`,
        });
      }

      // LOAD: existing_grant (lines 365-368)
      const existing_grant = await this.rewardGrantRepo.findByAssignmentId(
        asg.id,
        queryRunner,
      );

      // GUARD: submission.status == 'pending' (lines 369-371)
      if (sub.status !== 'pending') {
        throw new ConflictException({
          code: 'SUBMISSION_NOT_APPROVABLE',
          message: `Cannot approve submission in status: ${sub.status}`,
        });
      }

      // WRITE: update submission (lines 374-382)
      await this.submissionRepo.update(
        submission_id,
        {
          status: 'approved',
          reviewed_by_user_id: Number(actor.actor_user_id), // Convert actor_user_id to number
          feedback: request.feedback || null,
          reviewed_at: new Date(),
        },
        queryRunner,
      );

      // WRITE: update assignment (lines 383-389)
      await this.assignmentRepo.update(
        asg.id,
        {
          status: 'completed',
          completed_at: new Date(),
        },
        queryRunner,
      );

      // WRITE: derive reward_dedupe_key (lines 390-392)
      const reward_dedupe_key = `mission_reward:${asg.id}`;

      // WRITE: create reward_grant if not exists (lines 393-408)
      let reward_grant_id: number;
      if (existing_grant === null) {
        reward_grant_id = await this.rewardGrantRepo.create(
          {
            assignment_id: asg.id,
            user_id: asg.user_id,
            reward_type: defn.reward_json?.reward_type || 'coins',
            amount: defn.reward_json?.amount || 0,
            currency: defn.reward_json?.currency || 'MYR',
            status: 'requested',
            idempotency_key: reward_dedupe_key,
          },
          queryRunner,
        );
      } else {
        reward_grant_id = existing_grant.id;
      }

      // EMIT: MISSION_SUBMISSION_APPROVED (lines 420-428)
      await this.outboxService.enqueue(
        {
          event_name: 'MISSION_SUBMISSION_APPROVED',
          event_version: 1,
          aggregate_type: 'MISSION_SUBMISSION',
          aggregate_id: String(submission_id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `approve-sub-${submission_id}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-approve-${submission_id}`,
          payload: {
            submission_id,
            assignment_id: asg.id,
            reviewed_by_user_id: actor.actor_user_id,
          },
        },
        queryRunner,
      );

      // EMIT: MISSION_COMPLETED (lines 429-436)
      await this.outboxService.enqueue(
        {
          event_name: 'MISSION_COMPLETED',
          event_version: 1,
          aggregate_type: 'MISSION_ASSIGNMENT',
          aggregate_id: String(asg.id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `approve-sub-${submission_id}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-approve-${submission_id}`,
          payload: {
            assignment_id: asg.id,
            mission_definition_id: asg.mission_id,
            user_id: asg.user_id,
          },
        },
        queryRunner,
      );

      // EMIT: MISSION_REWARD_REQUESTED (lines 437-447)
      await this.outboxService.enqueue(
        {
          event_name: 'MISSION_REWARD_REQUESTED',
          event_version: 1,
          aggregate_type: 'MISSION_REWARD_GRANT',
          aggregate_id: String(reward_grant_id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `approve-sub-${submission_id}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-approve-${submission_id}`,
          payload: {
            reward_grant_id,
            assignment_id: asg.id,
            mission_definition_id: asg.mission_id,
            user_id: asg.user_id,
            reward_json: defn.reward_json,
            idempotency_key: reward_dedupe_key,
          },
          dedupe_key: reward_dedupe_key,
        },
        queryRunner,
      );

      // Response (lines 448-456)
      return {
        submission_id,
        submission_status: 'approved',
        assignment_id: asg.id,
        assignment_status: 'completed',
        reward_grant_id,
        reward_status: 'requested',
      };
    });

    return result;
  }

  /**
   * MISSION DEFINITION.CREATE COMMAND
   * Source: specs/mission/mission.pillar.yml lines 131-176
   *
   * HTTP: POST /v1/missions/definitions
   * Idempotency: Via Idempotency-Key header
   *
   * Flow:
   * 1. Guard: validate code length, time range
   * 2. Write: insert mission_definition with status='draft'
   * 3. Derive: mission_definition_id (AUTO_INCREMENT)
   * 4. Emit: MISSION_DEFINITION_CREATED event
   */
  async createMissionDefinition(
    request: MissionDefinitionCreateRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    // Transaction wrapper (line 143)
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: validate code length (lines 137-139)
      if (!request.code || request.code.length === 0) {
        throw new BadRequestException({
          code: 'INVALID_CODE',
          message: 'Mission code cannot be empty',
        });
      }

      // GUARD: validate time range (lines 140-141)
      if (request.ends_at && request.starts_at && request.ends_at <= request.starts_at) {
        throw new BadRequestException({
          code: 'INVALID_TIME_RANGE',
          message: 'ends_at must be after starts_at',
        });
      }

      // WRITE: insert mission_definition (lines 144-160)
      const mission_definition_id = await this.missionDefRepo.create(
        {
          code: request.code,
          name: request.title,
          description: request.description || null,
          cadence: request.cadence,
          start_at: request.starts_at || null,
          end_at: request.ends_at || null,
          max_total: request.max_total || null,
          max_per_user: request.max_per_user || 1,
          criteria_json: request.criteria_json || null,
          reward_json: request.reward_json || null,
          status: 'draft',
        },
        queryRunner,
      );

      // EMIT: MISSION_DEFINITION_CREATED event (lines 164-172)
      await this.outboxService.enqueue(
        {
          event_name: 'MISSION_DEFINITION_CREATED',
          event_version: 1,
          aggregate_type: 'MISSION_DEFINITION',
          aggregate_id: String(mission_definition_id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `create-${mission_definition_id}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-create-${mission_definition_id}`,
          payload: {
            id: mission_definition_id,
            code: request.code,
            title: request.title,
            cadence: request.cadence,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      // Response (lines 173-176)
      return {
        id: mission_definition_id,
        status: 'draft',
      };
    });

    return result;
  }

  /**
   * MISSION.ASSIGN COMMAND
   * Source: specs/mission/mission.pillar.yml lines 210-269
   *
   * HTTP: POST /v1/missions/definitions/{definition_id}/assign
   * Idempotency: Via Idempotency-Key header
   *
   * Flow:
   * 1. Load: definition, existing assignment
   * 2. Guard: definition.status == 'published', no existing assignment
   * 3. Write: insert assignment, insert event
   * 4. Derive: assignment_id (AUTO_INCREMENT)
   * 5. Emit: MISSION_ASSIGNED event
   */
  async assignMission(
    definition_id: number,
    request: MissionAssignRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    // Transaction wrapper (line 232)
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: definition (lines 216-219)
      const defn = await this.missionDefRepo.findById(definition_id, queryRunner);
      if (!defn) {
        throw new NotFoundException({
          code: 'MISSION_NOT_FOUND',
          message: `Mission definition ${definition_id} not found`,
        });
      }

      // LOAD: existing assignment (lines 220-225)
      const existing = await this.assignmentRepo.findByMissionAndUser(
        definition_id,
        request.user_id,
        queryRunner,
      );

      // GUARD: definition.status == 'published' (lines 226-228)
      if (defn.status !== 'published') {
        throw new ConflictException({
          code: 'MISSION_NOT_OPEN',
          message: `Mission is not published, current status: ${defn.status}`,
        });
      }

      // GUARD: no existing assignment (lines 229-231)
      if (existing !== null) {
        throw new ConflictException({
          code: 'ALREADY_ASSIGNED',
          message: `User ${request.user_id} already has an assignment for mission ${definition_id}`,
        });
      }

      // WRITE: derive assignment_dedupe_key (lines 233-236)
      const assignment_dedupe_key = idempotencyKey || `mission_assign:${definition_id}:${request.user_id}`;

      // WRITE: insert assignment (lines 237-245)
      const assignment_id = await this.assignmentRepo.create(
        {
          mission_id: definition_id,
          user_id: request.user_id,
          status: 'assigned',
          idempotency_key: assignment_dedupe_key,
          assigned_at: new Date(),
        },
        queryRunner,
      );

      // EMIT: MISSION_ASSIGNED event (lines 258-267)
      await this.outboxService.enqueue(
        {
          event_name: 'MISSION_ASSIGNED',
          event_version: 1,
          aggregate_type: 'MISSION_ASSIGNMENT',
          aggregate_id: String(assignment_id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `assign-${assignment_id}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-assign-${assignment_id}`,
          payload: {
            assignment_id,
            mission_definition_id: definition_id,
            user_id: request.user_id,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      // Response (lines 268-269)
      return {
        assignment_id,
        status: 'assigned',
      };
    });

    return result;
  }

  /**
   * MISSION.SUBMIT COMMAND
   * Source: specs/mission/mission.pillar.yml lines 271-347
   *
   * HTTP: POST /v1/missions/assignments/{assignment_id}/submit
   * Idempotency: Via Idempotency-Key header
   *
   * Flow:
   * 1. Load: assignment, existing_submission
   * 2. Guard: assignment belongs to user, status submittable, no existing submission
   * 3. Write: insert submission, update assignment, insert event
   * 4. Derive: submission_id (AUTO_INCREMENT)
   * 5. Emit: MISSION_SUBMITTED event
   */
  async submitMission(
    assignment_id: number,
    request: MissionSubmitRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    // Transaction wrapper (line 293)
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: assignment (lines 277-280)
      const asg = await this.assignmentRepo.findById(assignment_id, queryRunner);
      if (!asg) {
        throw new NotFoundException({
          code: 'ASSIGNMENT_NOT_FOUND',
          message: `Assignment ${assignment_id} not found`,
        });
      }

      // LOAD: existing_submission (lines 281-284)
      const existing_submission = await this.submissionRepo.findByAssignmentId(
        assignment_id,
        queryRunner,
      );

      // GUARD: assignment belongs to user (lines 285-287)
      if (asg.user_id !== Number(actor.actor_user_id)) {
        throw new ConflictException({
          code: 'NOT_OWNER',
          message: `Assignment does not belong to user ${actor.actor_user_id}`,
        });
      }

      // GUARD: assignment status is submittable (lines 288-289)
      if (!['assigned', 'in_progress', 'submitted'].includes(asg.status)) {
        throw new ConflictException({
          code: 'ASSIGNMENT_NOT_SUBMITTABLE',
          message: `Assignment status ${asg.status} is not submittable`,
        });
      }

      // GUARD: no existing submission (lines 290-292)
      if (existing_submission !== null) {
        throw new ConflictException({
          code: 'ALREADY_SUBMITTED',
          message: `Assignment ${assignment_id} already has a submission`,
        });
      }

      // WRITE: derive submission_dedupe_key (lines 294-297)
      const submission_dedupe_key = idempotencyKey || `mission_submit:${assignment_id}`;

      // WRITE: insert submission (lines 298-307)
      const submission_id = await this.submissionRepo.create(
        {
          assignment_id,
          text_content: request.text_content || null,
          meta_json: request.meta_json || null,
          status: 'pending',
          idempotency_key: submission_dedupe_key,
          submitted_at: new Date(),
        },
        queryRunner,
      );

      // WRITE: update assignment (lines 321-326)
      await this.assignmentRepo.update(
        assignment_id,
        {
          status: 'submitted',
        },
        queryRunner,
      );

      // EMIT: MISSION_SUBMITTED event (lines 336-345)
      await this.outboxService.enqueue(
        {
          event_name: 'MISSION_SUBMITTED',
          event_version: 1,
          aggregate_type: 'MISSION_SUBMISSION',
          aggregate_id: String(submission_id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `submit-${submission_id}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-submit-${submission_id}`,
          payload: {
            submission_id,
            assignment_id,
            user_id: actor.actor_user_id,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      // Response (lines 346-347)
      return {
        submission_id,
        status: 'pending',
      };
    });

    return result;
  }
}
