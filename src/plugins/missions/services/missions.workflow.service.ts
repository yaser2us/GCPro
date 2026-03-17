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
import { MissionEventRepository } from '../repositories/mission-event.repo';
import { MissionProgressRepository } from '../repositories/mission-progress.repo';
import { MissionSubmissionFileRepository } from '../repositories/mission-submission-file.repo';
import { MissionDefinitionCreateRequestDto } from '../dto/mission-definition-create.request.dto';
import { MissionDefinitionPublishRequestDto } from '../dto/mission-definition-publish.request.dto';
import { MissionDefinitionStateChangeRequestDto } from '../dto/mission-definition-state-change.request.dto';
import { MissionAssignRequestDto } from '../dto/mission-assign.request.dto';
import { MissionSubmitRequestDto } from '../dto/mission-submit.request.dto';
import { MissionApproveSubmissionRequestDto } from '../dto/mission-approve-submission.request.dto';
import { MissionProgressRecordRequestDto } from '../dto/mission-progress-record.request.dto';
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
    private readonly missionEventRepo: MissionEventRepository,
    private readonly progressRepo: MissionProgressRepository,
    private readonly submissionFileRepo: MissionSubmissionFileRepository,
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
   * 2. Guard: status must be 'paused'
   * 3. Write: update status='active' (activating/publishing)
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

      // GUARD: status must be 'paused' to activate/publish (lines 188-190)
      if (defn.status !== 'paused') {
        throw new ConflictException({
          code: 'MISSION_DEFINITION_NOT_PUBLISHABLE',
          message: `Cannot activate/publish mission in status: ${defn.status}. Must be paused.`,
        });
      }

      // WRITE: update mission_definition to 'active' (lines 193-199)
      await this.missionDefRepo.update(
        id,
        {
          status: 'active',
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
        mission_definition_id: id,
        status: 'active',
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

      // WRITE: upsert reward_grant (exactly-once by assignment_id) (lines 393-408)
      const reward_grant_id = await this.rewardGrantRepo.upsert(
        {
          assignment_id: asg.id,
          user_id: asg.user_id,
          amount: defn.reward_json?.amount || 0,
          status: 'requested',
          idempotency_key: reward_dedupe_key,
        },
        queryRunner,
      );

      // WRITE: insert mission_event (audit trail)
      await this.missionEventRepo.create(
        {
          assignment_id: asg.id,
          event_type: 'approved',
          payload_json: {
            submission_id,
          },
        },
        queryRunner,
      );

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
   * 2. Write: insert mission_definition with status='active'
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
      if (request.end_at && request.start_at && request.end_at <= request.start_at) {
        throw new BadRequestException({
          code: 'INVALID_TIME_RANGE',
          message: 'end_at must be after start_at',
        });
      }

      // WRITE: upsert mission_definition (lines 144-160, idempotent by code)
      const mission_definition_id = await this.missionDefRepo.upsert(
        {
          code: request.code,
          name: request.name,
          description: request.description || null,
          scope: request.scope || 'global',
          cadence: request.cadence,
          trigger_type: request.trigger_type || 'event',
          start_at: request.start_at || null,
          end_at: request.end_at || null,
          max_total: request.max_total || null,
          max_per_user: request.max_per_user || 1,
          criteria_json: request.criteria_json || null,
          reward_json: request.reward_json || null,
          status: 'active',
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
            name: request.name,
            cadence: request.cadence,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      // Response (lines 173-176)
      return {
        mission_definition_id,
        status: 'active',
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
   * 2. Guard: definition.status == 'active', no existing assignment
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

      // GUARD: definition.status == 'active' (lines 226-228)
      if (defn.status !== 'active') {
        throw new ConflictException({
          code: 'MISSION_NOT_OPEN',
          message: `Mission is not active, current status: ${defn.status}`,
        });
      }

      // WRITE: derive assignment_dedupe_key (lines 233-236)
      const assignment_dedupe_key = idempotencyKey || `mission_assign:${definition_id}:${request.user_id}`;

      // WRITE: upsert assignment (idempotent by mission_id + user_id) (lines 237-245)
      const assignment_id = await this.assignmentRepo.upsert(
        {
          mission_id: definition_id,
          user_id: Number(request.user_id),
          status: 'assigned',
          idempotency_key: assignment_dedupe_key,
        },
        queryRunner,
      );

      // WRITE: insert mission_event (audit trail)
      await this.missionEventRepo.create(
        {
          assignment_id,
          event_type: 'assigned',
          payload_json: {
            user_id: request.user_id,
            mission_id: definition_id,
          },
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

      console.log('Loaded assignment:', asg.user_id, 'Actor:',  Number(actor.actor_user_id));
      // GUARD: assignment belongs to user (lines 285-287)
      if (Number(asg.user_id) !== Number(actor.actor_user_id)) {
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

      // WRITE: insert mission_event (audit trail)
      await this.missionEventRepo.create(
        {
          assignment_id,
          event_type: 'submitted',
          payload_json: {
            submission_id,
          },
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

  /**
   * MISSION DEFINITION.GET QUERY
   * Source: specs/mission/mission.pillar.yml lines 336-354
   *
   * HTTP: GET /v1/missions/definitions/{mission_definition_id}
   *
   * Flow:
   * 1. Load: mission_definition by id
   * 2. Guard: exists
   */
  async getMissionDefinition(mission_definition_id: number) {
    const definition = await this.missionDefRepo.findById(mission_definition_id);
    if (!definition) {
      throw new NotFoundException({
        code: 'MISSION_DEFINITION_NOT_FOUND',
        message: `Mission definition with id ${mission_definition_id} not found`,
      });
    }
    return definition;
  }

  /**
   * MISSION DEFINITION.LIST QUERY
   * Source: specs/mission/mission.pillar.yml lines 356-369
   *
   * HTTP: GET /v1/missions/definitions
   *
   * Flow:
   * 1. Load: all mission_definitions
   */
  async listMissionDefinitions() {
    const definitions = await this.missionDefRepo.findAll();
    return { items: definitions };
  }

  /**
   * MISSION ASSIGNMENT.GET QUERY
   * Source: specs/mission/mission.pillar.yml lines 579-598
   *
   * HTTP: GET /v1/missions/assignments/{assignment_id}
   *
   * Flow:
   * 1. Load: assignment by id
   * 2. Guard: exists
   */
  async getMissionAssignment(assignment_id: number) {
    const assignment = await this.assignmentRepo.findById(assignment_id);
    if (!assignment) {
      throw new NotFoundException({
        code: 'MISSION_ASSIGNMENT_NOT_FOUND',
        message: `Assignment ${assignment_id} not found`,
      });
    }
    return assignment;
  }

  /**
   * MISSION ASSIGNMENT.LIST BY USER QUERY
   * Source: specs/mission/mission.pillar.yml lines 599-614
   *
   * HTTP: GET /v1/users/{user_id}/mission-assignments
   *
   * Flow:
   * 1. Load: all assignments for user_id
   */
  async listMissionAssignmentsByUser(user_id: number) {
    const assignments = await this.assignmentRepo.findByUserId(user_id);
    return { items: assignments };
  }

  /**
   * MISSION SUBMISSION.GET QUERY
   * Source: specs/mission/mission.pillar.yml lines 748-766
   *
   * HTTP: GET /v1/missions/submissions/{submission_id}
   *
   * Flow:
   * 1. Load: submission by id
   * 2. Guard: exists
   */
  async getMissionSubmission(submission_id: number) {
    const submission = await this.submissionRepo.findById(submission_id);
    if (!submission) {
      throw new NotFoundException({
        code: 'MISSION_SUBMISSION_NOT_FOUND',
        message: `Submission ${submission_id} not found`,
      });
    }
    return submission;
  }

  /**
   * MISSION REWARD GRANT.GET BY ASSIGNMENT QUERY
   * Source: specs/mission/mission.pillar.yml lines 979-992
   *
   * HTTP: GET /v1/missions/assignments/{assignment_id}/reward-grant
   *
   * Flow:
   * 1. Load: reward_grant by assignment_id
   */
  async getRewardGrantByAssignment(assignment_id: number) {
    const rewardGrant = await this.rewardGrantRepo.findByAssignmentId(assignment_id);
    return rewardGrant;
  }

  /**
   * MISSION EVENT.LIST BY ASSIGNMENT QUERY
   * Source: specs/mission/mission.pillar.yml lines 994-1008
   *
   * HTTP: GET /v1/missions/assignments/{assignment_id}/events
   *
   * Flow:
   * 1. Load: all events for assignment_id
   */
  async listEventsByAssignment(assignment_id: number) {
    const events = await this.missionEventRepo.findByAssignmentId(assignment_id);
    return { items: events };
  }

  /**
   * MISSION PROGRESS.RECORD COMMAND
   * Source: specs/mission/missions.pillar.v2.yml lines 1198-1268
   *
   * HTTP: POST /v1/missions/assignments/{assignment_id}/progress
   * Idempotency: Via Idempotency-Key header
   *
   * Flow:
   * 1. Load: assignment
   * 2. Guard: assignment exists and status allows progress
   * 3. Write: upsert progress, update assignment status if needed
   * 4. Emit: MISSION_PROGRESS_RECORDED event
   */
  async recordMissionProgress(
    assignment_id: number,
    request: MissionProgressRecordRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: assignment
      const assignment = await this.assignmentRepo.findById(assignment_id, queryRunner);
      if (!assignment) {
        throw new NotFoundException({
          code: 'MISSION_ASSIGNMENT_NOT_FOUND',
          message: `Assignment ${assignment_id} not found`,
        });
      }

      // GUARD: assignment status allows progress
      if (!['assigned', 'in_progress'].includes(assignment.status)) {
        throw new ConflictException({
          code: 'MISSION_PROGRESS_NOT_ALLOWED',
          message: `Cannot record progress for assignment in status: ${assignment.status}`,
        });
      }

      // WRITE: upsert progress
      await this.progressRepo.upsert(
        {
          assignment_id,
          metric_code: request.metric_code,
          current_value: request.current_value,
          target_value: request.target_value || 1,
          status: 'tracking',
          meta_json: request.meta_json || null,
        },
        queryRunner,
      );

      // WRITE: update assignment to in_progress if assigned
      if (assignment.status === 'assigned') {
        await this.assignmentRepo.update(
          assignment_id,
          {
            status: 'in_progress',
            started_at: new Date(),
          },
          queryRunner,
        );
      }

      // WRITE: insert mission_event
      await this.missionEventRepo.create(
        {
          assignment_id,
          event_type: 'progress_recorded',
          payload_json: {
            metric_code: request.metric_code,
            current_value: request.current_value,
          },
        },
        queryRunner,
      );

      // EMIT: MISSION_PROGRESS_RECORDED event
      await this.outboxService.enqueue(
        {
          event_name: 'MISSION_PROGRESS_RECORDED',
          event_version: 1,
          aggregate_type: 'MISSION_ASSIGNMENT',
          aggregate_id: String(assignment_id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `progress-${assignment_id}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-progress-${assignment_id}`,
          payload: {
            assignment_id,
            metric_code: request.metric_code,
            current_value: request.current_value,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        assignment_id,
        metric_code: request.metric_code,
        current_value: request.current_value,
      };
    });

    return result;
  }

  /**
   * MISSION DEFINITION.PAUSE COMMAND
   * Source: specs/mission/missions.pillar.v2.yml lines 962-1006
   *
   * HTTP: POST /v1/missions/definitions/{mission_definition_id}/pause
   * Idempotency: Via Idempotency-Key header
   */
  async pauseMissionDefinition(
    id: number,
    request: MissionDefinitionStateChangeRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: mission_definition
      const defn = await this.missionDefRepo.findById(id, queryRunner);
      if (!defn) {
        throw new NotFoundException({
          code: 'MISSION_DEFINITION_NOT_FOUND',
          message: `Mission definition with id ${id} not found`,
        });
      }

      // GUARD: status == 'active'
      if (defn.status !== 'active') {
        throw new ConflictException({
          code: 'MISSION_DEFINITION_NOT_PAUSABLE',
          message: `Cannot pause mission in status: ${defn.status}`,
        });
      }

      // WRITE: update mission_definition
      await this.missionDefRepo.update(
        id,
        {
          status: 'paused',
        },
        queryRunner,
      );

      // EMIT: MISSION_DEFINITION_PAUSED event
      await this.outboxService.enqueue(
        {
          event_name: 'MISSION_DEFINITION_PAUSED',
          event_version: 1,
          aggregate_type: 'MISSION_DEFINITION',
          aggregate_id: String(id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `pause-${id}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-pause-${id}`,
          payload: {
            mission_definition_id: id,
            reason: request.reason,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        mission_definition_id: id,
        status: 'paused',
      };
    });

    return result;
  }

  /**
   * MISSION DEFINITION.RETIRE COMMAND
   * Source: specs/mission/missions.pillar.v2.yml lines 1052-1095
   *
   * HTTP: POST /v1/missions/definitions/{mission_definition_id}/retire
   * Idempotency: Via Idempotency-Key header
   */
  async retireMissionDefinition(
    id: number,
    request: MissionDefinitionStateChangeRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: mission_definition
      const defn = await this.missionDefRepo.findById(id, queryRunner);
      if (!defn) {
        throw new NotFoundException({
          code: 'MISSION_DEFINITION_NOT_FOUND',
          message: `Mission definition with id ${id} not found`,
        });
      }

      // GUARD: status != 'retired'
      if (defn.status === 'retired') {
        throw new ConflictException({
          code: 'MISSION_DEFINITION_ALREADY_RETIRED',
          message: `Mission definition is already retired`,
        });
      }

      // WRITE: update mission_definition
      await this.missionDefRepo.update(
        id,
        {
          status: 'retired',
        },
        queryRunner,
      );

      // EMIT: MISSION_DEFINITION_RETIRED event
      await this.outboxService.enqueue(
        {
          event_name: 'MISSION_DEFINITION_RETIRED',
          event_version: 1,
          aggregate_type: 'MISSION_DEFINITION',
          aggregate_id: String(id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `retire-${id}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-retire-${id}`,
          payload: {
            mission_definition_id: id,
            reason: request.reason,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        mission_definition_id: id,
        status: 'retired',
      };
    });

    return result;
  }

  /**
   * MISSION SUBMISSION FILE.LIST BY SUBMISSION QUERY
   * Source: specs/mission/missions.pillar.v2.yml lines 1551-1569
   *
   * HTTP: GET /v1/missions/submissions/{submission_id}/files
   *
   * Flow:
   * 1. Load: all files for submission_id
   */
  async listSubmissionFiles(submission_id: number) {
    const files = await this.submissionFileRepo.findBySubmissionId(submission_id);
    return { items: files };
  }

  /**
   * MISSION PROGRESS.LIST BY ASSIGNMENT QUERY
   * HTTP: GET /v1/missions/assignments/{assignment_id}/progress
   */
  async listProgressByAssignment(assignment_id: number) {
    const progress = await this.progressRepo.findByAssignmentId(assignment_id);
    return { items: progress };
  }

  /**
   * MISSION SUBMISSION.REJECT COMMAND
   * Source: specs/mission/missions.pillar.v2.yml lines 1475-1550
   *
   * HTTP: POST /v1/missions/submissions/{submission_id}/reject
   * Idempotency: Via Idempotency-Key header
   */
  async rejectSubmission(
    submission_id: number,
    request: MissionApproveSubmissionRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: submission
      const sub = await this.submissionRepo.findById(submission_id, queryRunner);
      if (!sub) {
        throw new NotFoundException({
          code: 'MISSION_SUBMISSION_NOT_FOUND',
          message: `Submission ${submission_id} not found`,
        });
      }

      // LOAD: assignment
      const asg = await this.assignmentRepo.findById(sub.assignment_id, queryRunner);
      if (!asg) {
        throw new NotFoundException({
          code: 'MISSION_ASSIGNMENT_NOT_FOUND',
          message: `Assignment ${sub.assignment_id} not found`,
        });
      }

      // GUARD: submission.status == 'pending'
      if (sub.status !== 'pending') {
        throw new ConflictException({
          code: 'SUBMISSION_NOT_REJECTABLE',
          message: `Cannot reject submission in status: ${sub.status}`,
        });
      }

      // WRITE: update submission
      await this.submissionRepo.update(
        submission_id,
        {
          status: 'rejected',
          reviewed_by_user_id: Number(actor.actor_user_id),
          feedback: request.feedback || null,
          reviewed_at: new Date(),
        },
        queryRunner,
      );

      // WRITE: update assignment back to in_progress
      await this.assignmentRepo.update(
        asg.id,
        {
          status: 'in_progress',
        },
        queryRunner,
      );

      // WRITE: insert mission_event
      await this.missionEventRepo.create(
        {
          assignment_id: asg.id,
          event_type: 'rejected',
          payload_json: {
            submission_id,
          },
        },
        queryRunner,
      );

      // EMIT: MISSION_SUBMISSION_REJECTED event
      await this.outboxService.enqueue(
        {
          event_name: 'MISSION_SUBMISSION_REJECTED',
          event_version: 1,
          aggregate_type: 'MISSION_SUBMISSION',
          aggregate_id: String(submission_id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `reject-sub-${submission_id}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-reject-${submission_id}`,
          payload: {
            submission_id,
            assignment_id: asg.id,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        submission_id,
        submission_status: 'rejected',
        assignment_id: asg.id,
        assignment_status: 'in_progress',
      };
    });

    return result;
  }
}
