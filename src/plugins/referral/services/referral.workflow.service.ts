import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { OutboxService } from '../../../corekit/services/outbox.service';
import { ReferralProgramRepository } from '../repositories/referral-program.repo';
import { ReferralCodeRepository } from '../repositories/referral-code.repo';
import { ReferralInviteRepository } from '../repositories/referral-invite.repo';
import { ReferralConversionRepository } from '../repositories/referral-conversion.repo';
import { ReferralRewardGrantRepository } from '../repositories/referral-reward-grant.repo';
import { ReferralEventRepository } from '../repositories/referral-event.repo';
import { ReferralProgramCreateRequestDto } from '../dto/referral-program-create.request.dto';
import { ReferralProgramPauseRequestDto } from '../dto/referral-program-pause.request.dto';
import { ReferralCodeCreateRequestDto } from '../dto/referral-code-create.request.dto';
import { ReferralInviteCreateRequestDto } from '../dto/referral-invite-create.request.dto';
import { ReferralInviteClickRequestDto } from '../dto/referral-invite-click.request.dto';
import { ReferralConversionCreateRequestDto } from '../dto/referral-conversion-create.request.dto';
import type { Actor } from '../../../corekit/types/actor.type';
import { randomBytes } from 'crypto';

/**
 * Referral Workflow Service
 * Implements referral commands following the workflow discipline:
 * Guard → Write → Emit → Commit
 *
 * Based on specs/referral/referral.pillar.yml
 */
@Injectable()
export class ReferralWorkflowService {
  constructor(
    private readonly txService: TransactionService,
    private readonly outboxService: OutboxService,
    private readonly programRepo: ReferralProgramRepository,
    private readonly codeRepo: ReferralCodeRepository,
    private readonly inviteRepo: ReferralInviteRepository,
    private readonly conversionRepo: ReferralConversionRepository,
    private readonly rewardGrantRepo: ReferralRewardGrantRepository,
    private readonly eventRepo: ReferralEventRepository,
  ) {}

  /**
   * REFERRAL PROGRAM.CREATE COMMAND
   * Source: specs/referral/referral.pillar.yml lines 913-953
   *
   * HTTP: POST /v1/referral/programs
   * Idempotency: Via Idempotency-Key header
   */
  async createReferralProgram(
    request: ReferralProgramCreateRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: Validate program code and time range (lines 921-927)
      if (!request.code || request.code.length === 0) {
        throw new BadRequestException({
          code: 'INVALID_PROGRAM_CODE',
          message: 'Program code is required',
        });
      }

      if (
        request.end_at &&
        request.start_at &&
        request.end_at <= request.start_at
      ) {
        throw new BadRequestException({
          code: 'INVALID_TIME_RANGE',
          message: 'end_at must be after start_at',
        });
      }

      // WRITE: Insert referral_program (lines 928-940)
      const programId = await this.programRepo.create(
        {
          code: request.code,
          name: request.name,
          status: 'active',
          start_at: request.start_at || null,
          end_at: request.end_at || null,
          eligibility_json: request.eligibility_json || null,
          meta_json: request.meta_json || null,
        },
        queryRunner,
      );

      // EMIT: REFERRAL_PROGRAM_CREATED event (lines 941-948)
      await this.outboxService.enqueue(
        {
          event_name: 'REFERRAL_PROGRAM_CREATED',
          event_version: 1,
          aggregate_type: 'REFERRAL_PROGRAM',
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

      return { program_id: programId, status: 'active' };
    });

    return result;
  }

  /**
   * REFERRAL PROGRAM.PAUSE COMMAND
   * Source: specs/referral/referral.pillar.yml lines 955-989
   *
   * HTTP: POST /v1/referral/programs/{id}/pause
   * Idempotency: Via Idempotency-Key header
   */
  async pauseReferralProgram(
    id: number,
    request: ReferralProgramPauseRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: referral_program (lines 957-960)
      const program = await this.programRepo.findById(id, queryRunner);
      if (!program) {
        throw new NotFoundException({
          code: 'PROGRAM_NOT_FOUND',
          message: `Referral program with id ${id} not found`,
        });
      }

      // GUARD: Ensure program is active (lines 967-971)
      if (program.status !== 'active') {
        throw new ConflictException({
          code: 'PROGRAM_NOT_ACTIVE',
          message: `Cannot pause program in status: ${program.status}`,
        });
      }

      // WRITE: Update status to paused (lines 972-977)
      await this.programRepo.update(
        id,
        {
          status: 'paused',
        },
        queryRunner,
      );

      // EMIT: REFERRAL_PROGRAM_PAUSED event (lines 978-984)
      await this.outboxService.enqueue(
        {
          event_name: 'REFERRAL_PROGRAM_PAUSED',
          event_version: 1,
          aggregate_type: 'REFERRAL_PROGRAM',
          aggregate_id: String(id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `pause-program-${id}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-pause-program-${id}`,
          payload: {
            program_id: id,
            reason: request.reason,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return { program_id: id, status: 'paused' };
    });

    return result;
  }

  /**
   * REFERRAL PROGRAM.ACTIVATE COMMAND
   * Source: specs/referral/referral.pillar.yml lines 991-1024
   *
   * HTTP: POST /v1/referral/programs/{id}/activate
   * Idempotency: Via Idempotency-Key header
   */
  async activateReferralProgram(
    id: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: referral_program (lines 993-996)
      const program = await this.programRepo.findById(id, queryRunner);
      if (!program) {
        throw new NotFoundException({
          code: 'PROGRAM_NOT_FOUND',
          message: `Referral program with id ${id} not found`,
        });
      }

      // GUARD: Ensure program is paused (lines 1003-1007)
      if (program.status !== 'paused') {
        throw new ConflictException({
          code: 'PROGRAM_NOT_PAUSED',
          message: `Cannot activate program in status: ${program.status}`,
        });
      }

      // WRITE: Update status to active (lines 1008-1013)
      await this.programRepo.update(
        id,
        {
          status: 'active',
        },
        queryRunner,
      );

      // EMIT: REFERRAL_PROGRAM_ACTIVATED event (lines 1014-1020)
      await this.outboxService.enqueue(
        {
          event_name: 'REFERRAL_PROGRAM_ACTIVATED',
          event_version: 1,
          aggregate_type: 'REFERRAL_PROGRAM',
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

      return { program_id: id, status: 'active' };
    });

    return result;
  }

  /**
   * REFERRAL CODE.CREATE COMMAND
   * Source: specs/referral/referral.pillar.yml lines 1026-1066
   *
   * HTTP: POST /v1/referral/codes
   * Idempotency: Via Idempotency-Key header
   */
  async createReferralCode(
    request: ReferralCodeCreateRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: referral_program (lines 1034-1037)
      const program = await this.programRepo.findById(
        request.program_id,
        queryRunner,
      );
      if (!program) {
        throw new NotFoundException({
          code: 'PROGRAM_NOT_FOUND',
          message: `Referral program with id ${request.program_id} not found`,
        });
      }

      // GUARD: Ensure program is active (lines 1038-1042)
      if (program.status !== 'active') {
        throw new ConflictException({
          code: 'PROGRAM_NOT_ACTIVE',
          message: `Program must be active to create codes`,
        });
      }

      // Generate code if not provided
      const code = request.code || this.generateReferralCode();

      // WRITE: Upsert referral_code (lines 1043-1053)
      const codeId = await this.codeRepo.upsert(
        {
          program_id: request.program_id,
          owner_user_id: Number(actor.actor_user_id),
          code: code,
          status: 'active',
        },
        queryRunner,
      );

      return { code_id: codeId, status: 'active' };
    });

    return result;
  }

  /**
   * REFERRAL INVITE.CREATE COMMAND
   * Source: specs/referral/referral.pillar.yml lines 1068-1123
   *
   * HTTP: POST /v1/referral/invites
   * Idempotency: Via Idempotency-Key header
   */
  async createReferralInvite(
    request: ReferralInviteCreateRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: referral_code (lines 1076-1079)
      const code = await this.codeRepo.findById(
        request.referral_code_id,
        queryRunner,
      );
      if (!code) {
        throw new NotFoundException({
          code: 'CODE_NOT_FOUND',
          message: `Referral code with id ${request.referral_code_id} not found`,
        });
      }

      // GUARD: Ensure user owns the code and code is active (lines 1080-1086)
      if (Number(code.owner_user_id) !== Number(actor.actor_user_id)) {
        throw new ConflictException({
          code: 'NOT_CODE_OWNER',
          message: 'You do not own this referral code',
        });
      }

      if (code.status !== 'active') {
        throw new ConflictException({
          code: 'CODE_NOT_ACTIVE',
          message: 'Referral code is not active',
        });
      }

      // Generate invite token
      const inviteToken = this.generateInviteToken();

      // WRITE: Insert referral_invite (lines 1087-1099)
      const inviteId = await this.inviteRepo.create(
        {
          program_id: request.program_id,
          referral_code_id: request.referral_code_id,
          referrer_user_id: Number(actor.actor_user_id),
          channel_type: request.channel_type,
          channel_value: request.channel_value || null,
          invite_token: inviteToken,
          status: 'created',
        },
        queryRunner,
      );

      // WRITE: Insert referral_event (lines 1100-1108)
      await this.eventRepo.create(
        {
          program_id: request.program_id,
          invite_id: inviteId,
          event_type: 'invite_created',
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
        },
        queryRunner,
      );

      // EMIT: REFERRAL_INVITE_CREATED event (lines 1109-1118)
      await this.outboxService.enqueue(
        {
          event_name: 'REFERRAL_INVITE_CREATED',
          event_version: 1,
          aggregate_type: 'REFERRAL_INVITE',
          aggregate_id: String(inviteId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `create-invite-${inviteId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-create-invite-${inviteId}`,
          payload: {
            invite_id: inviteId,
            program_id: request.program_id,
            referrer_user_id: Number(actor.actor_user_id),
            invite_token: inviteToken,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        invite_id: inviteId,
        invite_token: inviteToken,
        status: 'created',
      };
    });

    return result;
  }

  /**
   * REFERRAL INVITE.CLICK COMMAND
   * Source: specs/referral/referral.pillar.yml lines 1125-1168
   *
   * HTTP: POST /v1/referral/invites/click
   * Idempotency: Via Idempotency-Key header
   */
  async clickReferralInvite(
    request: ReferralInviteClickRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: referral_invite (lines 1133-1136)
      const invite = await this.inviteRepo.findByToken(
        request.invite_token,
        queryRunner,
      );
      if (!invite) {
        throw new NotFoundException({
          code: 'INVITE_NOT_FOUND',
          message: 'Referral invite not found',
        });
      }

      // GUARD: Ensure invite is valid (lines 1137-1141)
      if (!['created', 'sent'].includes(invite.status)) {
        throw new ConflictException({
          code: 'INVITE_NOT_VALID',
          message: `Cannot click invite in status: ${invite.status}`,
        });
      }

      // WRITE: Update invite to clicked (lines 1142-1148)
      await this.inviteRepo.update(
        invite.id,
        {
          status: 'clicked',
          clicked_at: new Date(),
        },
        queryRunner,
      );

      // WRITE: Insert referral_event (lines 1149-1156)
      await this.eventRepo.create(
        {
          program_id: invite.program_id,
          invite_id: invite.id,
          event_type: 'invite_clicked',
          occurred_at: new Date(),
        },
        queryRunner,
      );

      // EMIT: REFERRAL_INVITE_CLICKED event (lines 1157-1163)
      await this.outboxService.enqueue(
        {
          event_name: 'REFERRAL_INVITE_CLICKED',
          event_version: 1,
          aggregate_type: 'REFERRAL_INVITE',
          aggregate_id: String(invite.id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `click-invite-${invite.id}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-click-invite-${invite.id}`,
          payload: {
            invite_id: invite.id,
            program_id: invite.program_id,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return { invite_id: invite.id, status: 'clicked' };
    });

    return result;
  }

  /**
   * REFERRAL CONVERSION.CREATE COMMAND
   * Source: specs/referral/referral.pillar.yml lines 1170-1243
   *
   * HTTP: POST /v1/referral/conversions
   * Idempotency: Via Idempotency-Key header
   */
  async createReferralConversion(
    request: ReferralConversionCreateRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: referral_invite (lines 1178-1181)
      const invite = await this.inviteRepo.findByToken(
        request.invite_token,
        queryRunner,
      );
      if (!invite) {
        throw new NotFoundException({
          code: 'INVITE_NOT_FOUND',
          message: 'Referral invite not found',
        });
      }

      // GUARD: Ensure invite is clicked (lines 1182-1186)
      if (!['clicked', 'sent', 'created'].includes(invite.status)) {
        throw new ConflictException({
          code: 'INVITE_NOT_VALID',
          message: `Cannot convert invite in status: ${invite.status}`,
        });
      }

      // WRITE: Upsert referral_conversion (lines 1187-1200)
      const conversionResult = await this.conversionRepo.upsert(
        {
          program_id: invite.program_id,
          invite_id: invite.id,
          referred_user_id: request.referred_user_id,
          status: 'converted',
          converted_at: new Date(),
          conversion_ref_type: request.conversion_ref_type || null,
          conversion_ref_id: request.conversion_ref_id || null,
          meta_json: request.meta_json || null,
        },
        queryRunner,
      );

      const conversionId = conversionResult.id;
      const isNew = conversionResult.isNew;

      // WHEN: is_new_record (lines 1201-1228)
      if (isNew) {
        // Update invite to converted
        await this.inviteRepo.update(
          invite.id,
          { status: 'converted' },
          queryRunner,
        );

        // Insert referral_event
        await this.eventRepo.create(
          {
            program_id: invite.program_id,
            invite_id: invite.id,
            conversion_id: conversionId,
            event_type: 'conversion_created',
            actor_user_id: String(request.referred_user_id),
            occurred_at: new Date(),
          },
          queryRunner,
        );

        // TODO: Call ReferralChainService.buildChain (lines 1220-1228)
        // This would be implemented in a separate service
      }

      // EMIT: REFERRAL_CONVERSION_CREATED event (lines 1229-1238)
      await this.outboxService.enqueue(
        {
          event_name: 'REFERRAL_CONVERSION_CREATED',
          event_version: 1,
          aggregate_type: 'REFERRAL_CONVERSION',
          aggregate_id: String(conversionId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `create-conversion-${conversionId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-create-conversion-${conversionId}`,
          payload: {
            conversion_id: conversionId,
            program_id: invite.program_id,
            invite_id: invite.id,
            referrer_user_id: invite.referrer_user_id,
            referred_user_id: request.referred_user_id,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return { conversion_id: conversionId, status: 'converted' };
    });

    return result;
  }

  /**
   * Generate a unique referral code
   */
  private generateReferralCode(): string {
    return randomBytes(4).toString('hex').toUpperCase();
  }

  /**
   * Generate a unique invite token
   */
  private generateInviteToken(): string {
    return randomBytes(32).toString('hex');
  }
}
