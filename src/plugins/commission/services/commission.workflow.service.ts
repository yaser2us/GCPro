import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { OutboxService } from '../../../corekit/services/outbox.service';
import { CommissionProgramRepository } from '../repositories/commission-program.repo';
import { CommissionParticipantRepository } from '../repositories/commission-participant.repo';
import { CommissionRuleRepository } from '../repositories/commission-rule.repo';
import { CommissionAccrualRepository } from '../repositories/commission-accrual.repo';
import { CommissionPayoutBatchRepository } from '../repositories/commission-payout-batch.repo';
import { CommissionPayoutItemRepository } from '../repositories/commission-payout-item.repo';
import { CreateProgramRequestDto } from '../dto/create-program.request.dto';
import { EnrollParticipantRequestDto } from '../dto/enroll-participant.request.dto';
import { CreateRuleRequestDto } from '../dto/create-rule.request.dto';
import { RecordAccrualRequestDto } from '../dto/record-accrual.request.dto';
import { CreatePayoutBatchRequestDto } from '../dto/create-payout-batch.request.dto';
import { UpdateParticipantStatusRequestDto } from '../dto/update-participant-status.request.dto';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * Commission Workflow Service
 * Implements commission commands following the workflow discipline:
 * Guard → Write → Emit → Commit
 *
 * Based on specs/commission/commission.pillar.v2.yml
 */
@Injectable()
export class CommissionWorkflowService {
  constructor(
    private readonly txService: TransactionService,
    private readonly outboxService: OutboxService,
    private readonly programRepo: CommissionProgramRepository,
    private readonly participantRepo: CommissionParticipantRepository,
    private readonly ruleRepo: CommissionRuleRepository,
    private readonly accrualRepo: CommissionAccrualRepository,
    private readonly payoutBatchRepo: CommissionPayoutBatchRepository,
    private readonly payoutItemRepo: CommissionPayoutItemRepository,
  ) {}

  /**
   * CREATE PROGRAM COMMAND
   * Source: specs/commission/commission.pillar.v2.yml lines 1117-1144
   *
   * HTTP: POST /api/commission/programs
   */
  async createProgram(
    request: CreateProgramRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // WRITE: Upsert commission_program
      const programId = await this.programRepo.upsert(
        {
          code: request.code,
          name: request.name,
          status: 'active',
          currency: request.currency || 'MYR',
          settlement_cycle: request.settlement_cycle || 'monthly',
          meta_json: request.meta_json || null,
        },
        queryRunner,
      );

      // EMIT: PROGRAM_CREATED event
      await this.outboxService.enqueue(
        {
          event_name: 'PROGRAM_CREATED',
          event_version: 1,
          aggregate_type: 'PROGRAM',
          aggregate_id: String(programId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `create-program-${programId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-create-program-${programId}`,
          payload: {
            program_id: programId,
            code: request.code,
            name: request.name,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return { program_id: programId };
    });

    return result;
  }

  /**
   * PAUSE PROGRAM COMMAND
   * Source: specs/commission/commission.pillar.v2.yml lines 1182-1211
   *
   * HTTP: POST /api/commission/programs/:id/pause
   */
  async pauseProgram(
    id: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: commission_program
      const program = await this.programRepo.findById(id, queryRunner);
      if (!program) {
        throw new NotFoundException({
          code: 'PROGRAM_NOT_FOUND',
          message: `Commission program with id ${id} not found`,
        });
      }

      // GUARD: Ensure program is active
      if (program.status !== 'active') {
        throw new ConflictException({
          code: 'PROGRAM_NOT_ACTIVE',
          message: `Program must be active to pause`,
        });
      }

      // WRITE: Update status to paused
      await this.programRepo.update(
        id,
        { status: 'paused' },
        queryRunner,
      );

      // EMIT: PROGRAM_PAUSED event
      await this.outboxService.enqueue(
        {
          event_name: 'PROGRAM_PAUSED',
          event_version: 1,
          aggregate_type: 'PROGRAM',
          aggregate_id: String(id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `pause-program-${id}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-pause-program-${id}`,
          payload: {
            program_id: id,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return { success: true };
    });

    return result;
  }

  /**
   * ACTIVATE PROGRAM COMMAND
   * Source: specs/commission/commission.pillar.v2.yml lines 1213-1242
   *
   * HTTP: POST /api/commission/programs/:id/activate
   */
  async activateProgram(
    id: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: commission_program
      const program = await this.programRepo.findById(id, queryRunner);
      if (!program) {
        throw new NotFoundException({
          code: 'PROGRAM_NOT_FOUND',
          message: `Commission program with id ${id} not found`,
        });
      }

      // GUARD: Ensure program is paused
      if (program.status !== 'paused') {
        throw new ConflictException({
          code: 'PROGRAM_NOT_PAUSED',
          message: `Program must be paused to activate`,
        });
      }

      // WRITE: Update status to active
      await this.programRepo.update(
        id,
        { status: 'active' },
        queryRunner,
      );

      // EMIT: PROGRAM_ACTIVATED event
      await this.outboxService.enqueue(
        {
          event_name: 'PROGRAM_ACTIVATED',
          event_version: 1,
          aggregate_type: 'PROGRAM',
          aggregate_id: String(id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `activate-program-${id}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-activate-program-${id}`,
          payload: {
            program_id: id,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return { success: true };
    });

    return result;
  }

  /**
   * ENROLL PARTICIPANT COMMAND
   * Source: specs/commission/commission.pillar.v2.yml lines 1244-1280
   *
   * HTTP: POST /api/commission/programs/:program_id/participants
   */
  async enrollParticipant(
    request: EnrollParticipantRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: commission_program
      const program = await this.programRepo.findById(request.program_id, queryRunner);
      if (!program) {
        throw new NotFoundException({
          code: 'PROGRAM_NOT_FOUND',
          message: `Commission program with id ${request.program_id} not found`,
        });
      }

      // GUARD: Ensure program is active
      if (program.status !== 'active') {
        throw new ConflictException({
          code: 'PROGRAM_NOT_ACTIVE',
          message: `Program must be active to enroll participants`,
        });
      }

      // WRITE: Upsert commission_participant
      const participantId = await this.participantRepo.upsert(
        {
          program_id: request.program_id,
          participant_type: request.participant_type,
          participant_id: request.participant_id,
          status: 'active',
          default_payout_method: request.default_payout_method || 'wallet',
          wallet_id: request.wallet_id || null,
          bank_profile_id: request.bank_profile_id || null,
          meta_json: request.meta_json || null,
        },
        queryRunner,
      );

      // EMIT: PARTICIPANT_ENROLLED event
      await this.outboxService.enqueue(
        {
          event_name: 'PARTICIPANT_ENROLLED',
          event_version: 1,
          aggregate_type: 'PROGRAM',
          aggregate_id: String(request.program_id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `enroll-participant-${participantId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-enroll-participant-${participantId}`,
          payload: {
            participant_id: participantId,
            program_id: request.program_id,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return { participant_id: participantId };
    });

    return result;
  }

  /**
   * UPDATE PARTICIPANT STATUS COMMAND
   * Source: specs/commission/commission.pillar.v2.yml lines 1282-1315
   *
   * HTTP: PUT /api/commission/participants/:id/status
   */
  async updateParticipantStatus(
    id: number,
    request: UpdateParticipantStatusRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: commission_participant
      const participant = await this.participantRepo.findById(id, queryRunner);
      if (!participant) {
        throw new NotFoundException({
          code: 'PARTICIPANT_NOT_FOUND',
          message: `Participant with id ${id} not found`,
        });
      }

      // GUARD: Validate status value
      if (!['active', 'inactive', 'suspended'].includes(request.status)) {
        throw new BadRequestException({
          code: 'INVALID_STATUS_VALUE',
          message: `Invalid status value: ${request.status}`,
        });
      }

      // WRITE: Update participant status
      await this.participantRepo.update(
        id,
        { status: request.status },
        queryRunner,
      );

      // EMIT: PARTICIPANT_STATUS_UPDATED event
      await this.outboxService.enqueue(
        {
          event_name: 'PARTICIPANT_STATUS_UPDATED',
          event_version: 1,
          aggregate_type: 'PROGRAM',
          aggregate_id: String(participant.program_id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `update-participant-status-${id}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-update-participant-status-${id}`,
          payload: {
            participant_id: id,
            status: request.status,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return { success: true };
    });

    return result;
  }

  /**
   * CREATE RULE COMMAND
   * Source: specs/commission/commission.pillar.v2.yml lines 1317-1357
   *
   * HTTP: POST /api/commission/programs/:program_id/rules
   */
  async createRule(
    request: CreateRuleRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: commission_program
      const program = await this.programRepo.findById(request.program_id, queryRunner);
      if (!program) {
        throw new NotFoundException({
          code: 'PROGRAM_NOT_FOUND',
          message: `Commission program with id ${request.program_id} not found`,
        });
      }

      // GUARD: Ensure program is active
      if (program.status !== 'active') {
        throw new ConflictException({
          code: 'PROGRAM_NOT_ACTIVE',
          message: `Program must be active to create rules`,
        });
      }

      // WRITE: Upsert commission_rule
      const ruleId = await this.ruleRepo.upsert(
        {
          program_id: request.program_id,
          code: request.code,
          name: request.name,
          status: 'active',
          rule_type: request.rule_type,
          rate_pct: request.rate_pct || null,
          amount_fixed: request.amount_fixed || null,
          priority: request.priority || 100,
          conditions_json: request.conditions_json || null,
          meta_json: request.meta_json || null,
          effective_from: request.effective_from || new Date(),
          effective_to: request.effective_to || null,
        },
        queryRunner,
      );

      // EMIT: RULE_CREATED event
      await this.outboxService.enqueue(
        {
          event_name: 'RULE_CREATED',
          event_version: 1,
          aggregate_type: 'PROGRAM',
          aggregate_id: String(request.program_id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `create-rule-${ruleId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-create-rule-${ruleId}`,
          payload: {
            rule_id: ruleId,
            program_id: request.program_id,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return { rule_id: ruleId };
    });

    return result;
  }

  /**
   * RECORD ACCRUAL COMMAND
   * Source: specs/commission/commission.pillar.v2.yml lines 1403-1449
   *
   * HTTP: POST /api/commission/accruals
   */
  async recordAccrual(
    request: RecordAccrualRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: commission_program
      const program = await this.programRepo.findById(request.program_id, queryRunner);
      if (!program) {
        throw new NotFoundException({
          code: 'PROGRAM_NOT_FOUND',
          message: `Commission program with id ${request.program_id} not found`,
        });
      }

      // GUARD: Ensure program is active
      if (program.status !== 'active') {
        throw new ConflictException({
          code: 'PROGRAM_NOT_ACTIVE',
          message: `Program must be active to record accruals`,
        });
      }

      // LOAD: commission_participant
      const participant = await this.participantRepo.findById(request.participant_id, queryRunner);
      if (!participant) {
        throw new NotFoundException({
          code: 'PARTICIPANT_NOT_FOUND',
          message: `Participant with id ${request.participant_id} not found`,
        });
      }

      // GUARD: Ensure participant is active
      if (participant.status !== 'active') {
        throw new ConflictException({
          code: 'PARTICIPANT_NOT_ACTIVE',
          message: `Participant must be active to record accruals`,
        });
      }

      // WRITE: Upsert commission_accrual
      const accrualId = await this.accrualRepo.upsert(
        {
          program_id: request.program_id,
          participant_id: request.participant_id,
          rule_id: request.rule_id || null,
          accrual_type: request.accrual_type,
          currency: request.currency || 'MYR',
          base_amount: request.base_amount || null,
          rate_pct: request.rate_pct || null,
          amount: request.amount,
          source_ref_type: request.source_ref_type || null,
          source_ref_id: request.source_ref_id || null,
          idempotency_key: request.idempotency_key,
          status: 'accrued',
          occurred_at: request.occurred_at || new Date(),
          meta_json: request.meta_json || null,
        },
        queryRunner,
      );

      // EMIT: ACCRUAL_RECORDED event
      await this.outboxService.enqueue(
        {
          event_name: 'ACCRUAL_RECORDED',
          event_version: 1,
          aggregate_type: 'PROGRAM',
          aggregate_id: String(request.program_id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `record-accrual-${accrualId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-record-accrual-${accrualId}`,
          payload: {
            accrual_id: accrualId,
            program_id: request.program_id,
            participant_id: request.participant_id,
            amount: request.amount,
            currency: request.currency || 'MYR',
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return { accrual_id: accrualId };
    });

    return result;
  }

  /**
   * VOID ACCRUAL COMMAND
   * Source: specs/commission/commission.pillar.v2.yml lines 1451-1482
   *
   * HTTP: PUT /api/commission/accruals/:id/void
   */
  async voidAccrual(
    id: number,
    reason: string,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: commission_accrual
      const accrual = await this.accrualRepo.findById(id, queryRunner);
      if (!accrual) {
        throw new NotFoundException({
          code: 'ACCRUAL_NOT_FOUND',
          message: `Accrual with id ${id} not found`,
        });
      }

      // GUARD: Ensure accrual is in accrued status
      if (accrual.status !== 'accrued') {
        throw new ConflictException({
          code: 'ACCRUAL_ALREADY_PROCESSED',
          message: `Accrual is already processed and cannot be voided`,
        });
      }

      // WRITE: Update accrual status to voided
      await this.accrualRepo.update(
        id,
        {
          status: 'voided',
          meta_json: {
            ...accrual.meta_json,
            void_reason: reason,
            voided_at: new Date().toISOString(),
          },
        },
        queryRunner,
      );

      // EMIT: ACCRUAL_VOIDED event
      await this.outboxService.enqueue(
        {
          event_name: 'ACCRUAL_VOIDED',
          event_version: 1,
          aggregate_type: 'PROGRAM',
          aggregate_id: String(accrual.program_id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `void-accrual-${id}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-void-accrual-${id}`,
          payload: {
            accrual_id: id,
            program_id: accrual.program_id,
            participant_id: accrual.participant_id,
            original_amount: accrual.amount,
            currency: accrual.currency,
            void_reason: reason,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return { success: true };
    });

    return result;
  }

  /**
   * CREATE PAYOUT BATCH COMMAND
   * Source: specs/commission/commission.pillar.v2.yml lines 1484-1520
   *
   * HTTP: POST /api/commission/programs/:program_id/payout-batches
   */
  async createPayoutBatch(
    request: CreatePayoutBatchRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: commission_program
      const program = await this.programRepo.findById(request.program_id, queryRunner);
      if (!program) {
        throw new NotFoundException({
          code: 'PROGRAM_NOT_FOUND',
          message: `Commission program with id ${request.program_id} not found`,
        });
      }

      // WRITE: Upsert commission_payout_batch
      const batchId = await this.payoutBatchRepo.upsert(
        {
          program_id: request.program_id,
          batch_code: request.batch_code,
          status: 'planned',
          currency: request.currency || 'MYR',
          period_start: request.period_start,
          period_end: request.period_end,
          total_amount: 0.00,
          meta_json: request.meta_json || null,
        },
        queryRunner,
      );

      // EMIT: PAYOUT_BATCH_CREATED event
      await this.outboxService.enqueue(
        {
          event_name: 'PAYOUT_BATCH_CREATED',
          event_version: 1,
          aggregate_type: 'PAYOUT_BATCH',
          aggregate_id: String(batchId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `create-batch-${batchId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-create-batch-${batchId}`,
          payload: {
            batch_id: batchId,
            program_id: request.program_id,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return { batch_id: batchId };
    });

    return result;
  }

  /**
   * PROCESS PAYOUT BATCH COMMAND (SIMPLIFIED)
   * Source: specs/commission/commission.pillar.v2.yml lines 1522-1562
   *
   * HTTP: POST /api/commission/payout-batches/:id/process
   *
   * NOTE: Complex batch processing logic with hooks needs implementation
   */
  async processPayoutBatch(
    id: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: commission_payout_batch
      const batch = await this.payoutBatchRepo.findById(id, queryRunner);
      if (!batch) {
        throw new NotFoundException({
          code: 'BATCH_NOT_FOUND',
          message: `Payout batch with id ${id} not found`,
        });
      }

      // GUARD: Ensure batch is in planned status
      if (batch.status !== 'planned') {
        throw new ConflictException({
          code: 'BATCH_ALREADY_PROCESSED',
          message: `Batch is already processed`,
        });
      }

      // WRITE: Update batch status to processing
      await this.payoutBatchRepo.update(
        id,
        { status: 'processing' },
        queryRunner,
      );

      // TODO: HOOK createPayoutItems - Create payout items for participants with accruals in period
      // TODO: HOOK executePayouts - Execute payouts for all items (wallet/bank transfers)

      // WRITE: Update batch status to completed
      await this.payoutBatchRepo.update(
        id,
        { status: 'completed' },
        queryRunner,
      );

      // EMIT: PAYOUT_BATCH_COMPLETED event
      await this.outboxService.enqueue(
        {
          event_name: 'PAYOUT_BATCH_COMPLETED',
          event_version: 1,
          aggregate_type: 'PAYOUT_BATCH',
          aggregate_id: String(id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `process-batch-${id}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-process-batch-${id}`,
          payload: {
            batch_id: id,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return { success: true };
    });

    return result;
  }
}
