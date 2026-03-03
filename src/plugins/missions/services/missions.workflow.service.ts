import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { IdempotencyService } from '../../../corekit/services/idempotency.service';
import { OutboxService } from '../../../corekit/services/outbox.service';
import { MissionsRepository } from '../repositories/missions.repo';
import { EnrollmentsRepository } from '../repositories/enrollments.repo';
import { SubmissionsRepository } from '../repositories/submissions.repo';
import { MissionApproveSubmissionRequestDto } from '../dto/mission-approve-submission.request.dto';
import { MissionPublishRequestDto } from '../dto/mission-publish.request.dto';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * Mission Workflow Service
 * Implements all mission commands following the workflow discipline:
 * Guard → Validate → Write → Emit → Commit
 *
 * Based on mission.pillar.yml
 */
@Injectable()
export class MissionsWorkflowService {
  constructor(
    private readonly txService: TransactionService,
    private readonly idempotencyService: IdempotencyService,
    private readonly outboxService: OutboxService,
    private readonly missionsRepo: MissionsRepository,
    private readonly enrollmentsRepo: EnrollmentsRepository,
    private readonly submissionsRepo: SubmissionsRepository,
  ) {}

  /**
   * PUBLISH MISSION COMMAND
   * Complete implementation following mission.pillar.yml lines 254-298
   *
   * HTTP: POST /v1/missions/{mission_id}/publish
   * Actor permissions: missions:admin OR missions:manage
   *
   * Flow:
   * 1. Idempotency check
   * 2. Transaction wrapper
   * 3. Load: mission
   * 4. Guards: status == DRAFT or PAUSED, mission not ended
   * 5. Write: update mission to PUBLISHED
   * 6. Emit: MISSION_PUBLISHED event
   * 7. Store idempotency response
   */
  async publishMission(
    mission_id: string,
    request: MissionPublishRequestDto,
    actor: Actor,
  ) {
    // ========== IDEMPOTENCY CHECK ==========
    // Spec: line 263 - scope: "actor_user_id + command_name + mission_id"
    const idempotencyScope = `${actor.actor_user_id}:Mission.Publish:${mission_id}`;

    const idempotencyResult = await this.idempotencyService.claimOrReplay({
      scope: idempotencyScope,
      idempotency_key: request.idempotency_key,
      fingerprint: JSON.stringify({ mission_id, actor }),
    });

    if (idempotencyResult.is_replay) {
      // Already executed → return cached response
      // Spec: line 265 - returns_previous_response_on_replay: true
      return idempotencyResult.stored_response_body;
    }

    // ========== TRANSACTION WRAPPER ==========
    // Spec: line 278 - transaction: "COREKIT.Transaction.run"
    const result = await this.txService.run(async (queryRunner) => {
      // ========== LOAD PHASE ==========
      // Spec: lines 266-271 - load mission

      const mission = await this.missionsRepo.findById(mission_id, queryRunner);
      if (!mission) {
        throw new NotFoundException('MISSION_NOT_FOUND');
      }

      // ========== GUARD PHASE ==========
      // Spec: lines 272-276 - business rule checks

      // Guard 1: mission.status == 'DRAFT' || mission.status == 'PAUSED'
      // Spec: line 273
      if (mission.status !== 'DRAFT' && mission.status !== 'PAUSED') {
        throw new ConflictException(
          'MISSION_NOT_PUBLISHABLE',
          `Mission status is ${mission.status}, expected DRAFT or PAUSED`,
        );
      }

      // Guard 2: now() < mission.ends_at
      // Spec: line 275
      const now = new Date();
      if (now >= mission.ends_at) {
        throw new ConflictException(
          'MISSION_ALREADY_ENDED',
          `Mission ended at ${mission.ends_at.toISOString()}`,
        );
      }

      // ========== WRITE PHASE ==========
      // Spec: lines 277-287 - update mission

      await this.missionsRepo.update(
        { mission_id },
        {
          status: 'PUBLISHED',
          published_at: new Date(),
          updated_by_user_id: actor.actor_user_id,
        },
        queryRunner,
      );

      // ========== EMIT PHASE ==========
      // Spec: lines 288-295 - emit MISSION_PUBLISHED event

      await this.outboxService.enqueue(
        {
          event_name: 'MISSION_PUBLISHED',
          event_version: 1,
          aggregate_type: 'MISSION',
          aggregate_id: mission_id,
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || uuidv7(),
          causation_id: actor.causation_id || uuidv7(),
          payload: {
            mission_id,
          },
        },
        queryRunner,
      );

      // ========== RESPONSE ==========
      // Spec: lines 296-298 - return response shape
      return {
        mission_id,
        status: 'PUBLISHED',
      };
    });

    // ========== COMMIT & CACHE RESPONSE ==========
    // Transaction committed successfully
    // Store response for idempotency replay
    await this.idempotencyService.storeResponse({
      scope: idempotencyScope,
      idempotency_key: request.idempotency_key,
      http_status: 200,
      response_body: result,
    });

    return result;
  }

  /**
   * APPROVE SUBMISSION COMMAND
   * Complete implementation following mission.pillar.yml lines 514-613
   *
   * HTTP: POST /v1/missions/{mission_id}/submissions/{submission_id}/approve
   * Actor permissions: missions:admin OR missions:review
   *
   * Flow:
   * 1. Idempotency check
   * 2. Transaction wrapper
   * 3. Load: mission, submission, enrollment
   * 4. Guards: submission.status == PENDING, enrollment.status == SUBMITTED
   * 5. Write: approve submission, complete enrollment, derive reward vars
   * 6. Emit: 3 events (SUBMISSION_APPROVED, MISSION_COMPLETED, REWARD_REQUESTED)
   * 7. Store idempotency response
   */
  async approveSubmission(
    mission_id: string,
    submission_id: string,
    request: MissionApproveSubmissionRequestDto,
    actor: Actor,
  ) {
    // ========== IDEMPOTENCY CHECK ==========
    // Spec: line 524 - scope: "actor_user_id + command_name + submission_id"
    const idempotencyScope = `${actor.actor_user_id}:Mission.ApproveSubmission:${submission_id}`;

    const idempotencyResult = await this.idempotencyService.claimOrReplay({
      scope: idempotencyScope,
      idempotency_key: request.idempotency_key,
      fingerprint: JSON.stringify({ mission_id, submission_id, actor }),
    });

    if (idempotencyResult.is_replay) {
      // Already executed → return cached response
      // Spec: line 526 - returns_previous_response_on_replay: true
      return idempotencyResult.stored_response_body;
    }

    // ========== TRANSACTION WRAPPER ==========
    // Spec: line 550 - transaction: "COREKIT.Transaction.run"
    const result = await this.txService.run(async (queryRunner) => {
      // ========== LOAD PHASE ==========
      // Spec: lines 527-543 - load mission, submission, enrollment

      // Load 1: mission (required)
      const mission = await this.missionsRepo.findById(mission_id, queryRunner);
      if (!mission) {
        throw new NotFoundException('MISSION_NOT_FOUND');
      }

      // Load 2: submission (required, must match mission_id)
      const submission = await this.submissionsRepo.findOne(
        { submission_id, mission_id },
        queryRunner,
      );
      if (!submission) {
        throw new NotFoundException('SUBMISSION_NOT_FOUND');
      }

      // Load 3: enrollment (required, linked via submission.enrollment_id)
      const enrollment = await this.enrollmentsRepo.findById(
        submission.enrollment_id,
        queryRunner,
      );
      if (!enrollment) {
        throw new NotFoundException('ENROLLMENT_NOT_FOUND');
      }

      // ========== GUARD PHASE ==========
      // Spec: lines 544-548 - business rule checks

      // Guard 1: submission.status == 'PENDING'
      if (submission.status !== 'PENDING') {
        throw new ConflictException(
          'SUBMISSION_NOT_APPROVABLE',
          `Submission status is ${submission.status}, expected PENDING`,
        );
      }

      // Guard 2: enrollment.status == 'SUBMITTED'
      if (enrollment.status !== 'SUBMITTED') {
        throw new ConflictException(
          'ENROLLMENT_NOT_COMPLETABLE',
          `Enrollment status is ${enrollment.status}, expected SUBMITTED`,
        );
      }

      // ========== WRITE PHASE ==========
      // Spec: lines 549-573 - write changes to database

      // Write Step 1: approve_submission
      // Spec: lines 552-560
      await this.submissionsRepo.update(
        { submission_id },
        {
          status: 'APPROVED',
          approved_at: new Date(),
          approved_by_user_id: actor.actor_user_id,
          approval_note: request.approval_note,
        },
        queryRunner,
      );

      // Write Step 2: complete_enrollment
      // Spec: lines 561-568
      await this.enrollmentsRepo.update(
        { enrollment_id: enrollment.enrollment_id },
        {
          status: 'COMPLETED',
          completed_at: new Date(),
          updated_at: new Date(),
        },
        queryRunner,
      );

      // Write Step 3: derive_reward_request
      // Spec: lines 569-573 - generate IDs for cross-plugin reward request
      const reward_request_id = uuidv7();
      const reward_idempotency_key = `mission_reward:${enrollment.enrollment_id}`;

      // ========== EMIT PHASE ==========
      // Spec: lines 574-605 - emit 3 events via outbox

      // Event 1: MISSION_SUBMISSION_APPROVED
      // Spec: lines 575-583
      await this.outboxService.enqueue(
        {
          event_name: 'MISSION_SUBMISSION_APPROVED',
          event_version: 1,
          aggregate_type: 'MISSION_SUBMISSION',
          aggregate_id: submission_id,
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || uuidv7(),
          causation_id: actor.causation_id || uuidv7(),
          payload: {
            mission_id,
            enrollment_id: enrollment.enrollment_id,
            submission_id,
          },
        },
        queryRunner,
      );

      // Event 2: MISSION_COMPLETED
      // Spec: lines 584-592
      await this.outboxService.enqueue(
        {
          event_name: 'MISSION_COMPLETED',
          event_version: 1,
          aggregate_type: 'MISSION_ENROLLMENT',
          aggregate_id: enrollment.enrollment_id,
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || uuidv7(),
          causation_id: actor.causation_id || uuidv7(),
          payload: {
            mission_id,
            enrollment_id: enrollment.enrollment_id,
            participant_user_id: enrollment.participant_user_id,
          },
        },
        queryRunner,
      );

      // Event 3: MISSION_REWARD_REQUESTED
      // Spec: lines 593-605 - THIS triggers the Wallet plugin!
      await this.outboxService.enqueue(
        {
          event_name: 'MISSION_REWARD_REQUESTED',
          event_version: 1,
          aggregate_type: 'MISSION_ENROLLMENT',
          aggregate_id: enrollment.enrollment_id,
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || uuidv7(),
          causation_id: actor.causation_id || uuidv7(),
          dedupe_key: reward_idempotency_key, // Prevent duplicate rewards!
          payload: {
            mission_id,
            enrollment_id: enrollment.enrollment_id,
            participant_user_id: enrollment.participant_user_id,
            reward: mission.reward_json, // From mission definition
            reward_request_id,
            reward_idempotency_key,
          },
        },
        queryRunner,
      );

      // ========== RESPONSE ==========
      // Spec: lines 606-612 - return response shape
      return {
        submission_id,
        submission_status: 'APPROVED',
        enrollment_id: enrollment.enrollment_id,
        enrollment_status: 'COMPLETED',
      };
    });

    // ========== COMMIT & CACHE RESPONSE ==========
    // Transaction committed successfully
    // Store response for idempotency replay
    await this.idempotencyService.storeResponse({
      scope: idempotencyScope,
      idempotency_key: request.idempotency_key,
      http_status: 200,
      response_body: result,
    });

    return result;
  }
}
