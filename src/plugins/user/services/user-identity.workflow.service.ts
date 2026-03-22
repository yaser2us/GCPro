import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { OutboxService } from '../../../corekit/services/outbox.service';
import type { Actor } from '../../../corekit/types/actor.type';
import { DeviceTokenRepository } from '../repositories/device-token.repo';
import { RegistrationTokenRepository } from '../repositories/registration-token.repo';
import { VerificationStatusRepository } from '../repositories/verification-status.repo';
import { OnboardingProgressRepository } from '../repositories/onboarding-progress.repo';
import { DeviceTokenRegisterDto } from '../dto/device-token-register.dto';
import { RegistrationTokenIssueDto } from '../dto/registration-token-issue.dto';
import { RegistrationTokenVerifyDto } from '../dto/registration-token-verify.dto';
import { VerificationStatusUpsertDto } from '../dto/verification-status-upsert.dto';
import { OnboardingProgressUpsertDto } from '../dto/onboarding-progress-upsert.dto';

/**
 * UserIdentityWorkflowService
 * Implements all commands for the user-identity pillar.
 * Based on specs/user-identity/user-identity.pillar.v2.yml
 */
@Injectable()
export class UserIdentityWorkflowService {
  constructor(
    private readonly txService: TransactionService,
    private readonly outboxService: OutboxService,
    private readonly deviceTokenRepo: DeviceTokenRepository,
    private readonly registrationTokenRepo: RegistrationTokenRepository,
    private readonly verificationStatusRepo: VerificationStatusRepository,
    private readonly onboardingProgressRepo: OnboardingProgressRepository,
  ) {}

  // ── DEVICE TOKEN ─────────────────────────────────────────────────────────────

  /** RegisterDevice: upsert device token, re-activate if same user */
  async registerDevice(
    dto: DeviceTokenRegisterDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const existing = await this.deviceTokenRepo.findByPlatformAndToken(
        dto.platform,
        dto.token,
        queryRunner,
      );

      if (existing && existing.user_id !== dto.user_id) {
        throw new ConflictException('DEVICE_TOKEN_OWNED_BY_ANOTHER_USER');
      }

      const id = await this.deviceTokenRepo.upsert(
        {
          user_id: dto.user_id,
          platform: dto.platform,
          token: dto.token,
          status: 'active',
          last_seen_at: new Date(),
        },
        queryRunner,
      );

      await this.outboxService.enqueue(
        {
          event_name: 'DEVICE_TOKEN_REGISTERED',
          event_version: 1,
          aggregate_type: 'DEVICE_TOKEN',
          aggregate_id: String(id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            user_id: dto.user_id,
            platform: dto.platform,
            status: 'active',
          },
        },
        queryRunner,
      );

      return this.deviceTokenRepo.findById(id, queryRunner);
    });
  }

  /** RevokeDevice: set device token status = 'revoked' */
  async revokeDevice(
    deviceTokenId: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const deviceToken = await this.deviceTokenRepo.findById(
        deviceTokenId,
        queryRunner,
      );

      if (!deviceToken) throw new NotFoundException('DEVICE_TOKEN_NOT_FOUND');
      if (deviceToken.status === 'revoked')
        throw new ConflictException('DEVICE_TOKEN_ALREADY_REVOKED');

      await this.deviceTokenRepo.update(
        deviceTokenId,
        { status: 'revoked' },
        queryRunner,
      );

      await this.outboxService.enqueue(
        {
          event_name: 'DEVICE_TOKEN_REVOKED',
          event_version: 1,
          aggregate_type: 'DEVICE_TOKEN',
          aggregate_id: String(deviceTokenId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            user_id: deviceToken.user_id,
            platform: deviceToken.platform,
          },
        },
        queryRunner,
      );

      return this.deviceTokenRepo.findById(deviceTokenId, queryRunner);
    });
  }

  // ── REGISTRATION TOKEN ────────────────────────────────────────────────────────

  /** IssueRegistrationToken: create a new verification token / OTP row */
  async issueRegistrationToken(
    dto: RegistrationTokenIssueDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const id = await this.registrationTokenRepo.insert(
        {
          purpose: dto.purpose ?? 'registration',
          channel_type: dto.channel_type,
          channel_value: dto.channel_value,
          invite_code: dto.invite_code ?? null,
          token: dto.token ?? null,
          otp_hash: dto.otp_hash ?? null,
          status: 'pending',
          meta_json: dto.meta_json ?? null,
          expires_at: new Date(dto.expires_at),
        },
        queryRunner,
      );

      const result = await this.registrationTokenRepo.findById(id, queryRunner);

      await this.outboxService.enqueue(
        {
          event_name: 'REGISTRATION_TOKEN_ISSUED',
          event_version: 1,
          aggregate_type: 'REGISTRATION_TOKEN',
          aggregate_id: String(id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            purpose: result!.purpose,
            channel_type: result!.channel_type,
            channel_value: result!.channel_value,
            expires_at: result!.expires_at,
          },
        },
        queryRunner,
      );

      return result;
    });
  }

  /** VerifyRegistrationToken: validate token/OTP, set status = 'verified' */
  async verifyRegistrationToken(
    registrationTokenId: number,
    dto: RegistrationTokenVerifyDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const regToken = await this.registrationTokenRepo.findById(
        registrationTokenId,
        queryRunner,
      );

      if (!regToken) throw new NotFoundException('REGISTRATION_TOKEN_NOT_FOUND');
      if (regToken.status !== 'pending')
        throw new ConflictException('REGISTRATION_TOKEN_NOT_PENDING');
      if (new Date(regToken.expires_at) <= new Date())
        throw new BadRequestException('REGISTRATION_TOKEN_EXPIRED');

      const tokenValid = await this.verifyTokenOrOtp(
        dto.token,
        regToken.token,
        dto.otp_plain,
        regToken.otp_hash,
      );
      if (!tokenValid) throw new BadRequestException('REGISTRATION_TOKEN_INVALID');

      await this.registrationTokenRepo.update(
        registrationTokenId,
        { status: 'verified' },
        queryRunner,
      );

      await this.outboxService.enqueue(
        {
          event_name: 'REGISTRATION_TOKEN_VERIFIED',
          event_version: 1,
          aggregate_type: 'REGISTRATION_TOKEN',
          aggregate_id: String(registrationTokenId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            purpose: regToken.purpose,
            channel_type: regToken.channel_type,
            channel_value: regToken.channel_value,
          },
        },
        queryRunner,
      );

      return this.registrationTokenRepo.findById(registrationTokenId, queryRunner);
    });
  }

  /** ConsumeRegistrationToken: mark a verified token as consumed */
  async consumeRegistrationToken(
    registrationTokenId: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const regToken = await this.registrationTokenRepo.findById(
        registrationTokenId,
        queryRunner,
      );

      if (!regToken) throw new NotFoundException('REGISTRATION_TOKEN_NOT_FOUND');
      if (regToken.status !== 'verified')
        throw new ConflictException('REGISTRATION_TOKEN_NOT_VERIFIED');

      await this.registrationTokenRepo.update(
        registrationTokenId,
        { status: 'consumed' },
        queryRunner,
      );

      await this.outboxService.enqueue(
        {
          event_name: 'REGISTRATION_TOKEN_CONSUMED',
          event_version: 1,
          aggregate_type: 'REGISTRATION_TOKEN',
          aggregate_id: String(registrationTokenId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            purpose: regToken.purpose,
            channel_type: regToken.channel_type,
            channel_value: regToken.channel_value,
          },
        },
        queryRunner,
      );

      return this.registrationTokenRepo.findById(registrationTokenId, queryRunner);
    });
  }

  /** ExpireRegistrationToken: force-expire a pending or verified token */
  async expireRegistrationToken(
    registrationTokenId: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const regToken = await this.registrationTokenRepo.findById(
        registrationTokenId,
        queryRunner,
      );

      if (!regToken) throw new NotFoundException('REGISTRATION_TOKEN_NOT_FOUND');
      if (regToken.status !== 'pending' && regToken.status !== 'verified')
        throw new ConflictException('REGISTRATION_TOKEN_ALREADY_TERMINAL');

      await this.registrationTokenRepo.update(
        registrationTokenId,
        { status: 'expired' },
        queryRunner,
      );

      await this.outboxService.enqueue(
        {
          event_name: 'REGISTRATION_TOKEN_EXPIRED',
          event_version: 1,
          aggregate_type: 'REGISTRATION_TOKEN',
          aggregate_id: String(registrationTokenId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            purpose: regToken.purpose,
            channel_type: regToken.channel_type,
            channel_value: regToken.channel_value,
          },
        },
        queryRunner,
      );

      return this.registrationTokenRepo.findById(registrationTokenId, queryRunner);
    });
  }

  // ── VERIFICATION STATUS ───────────────────────────────────────────────────────

  /** UpsertVerificationStatus: upsert per (account_id, type) */
  async upsertVerificationStatus(
    dto: VerificationStatusUpsertDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const id = await this.verificationStatusRepo.upsert(
        {
          account_id: dto.account_id,
          type: dto.type,
          status: dto.status,
          meta_json: dto.meta_json ?? null,
        },
        queryRunner,
      );

      await this.outboxService.enqueue(
        {
          event_name: 'VERIFICATION_STATUS_UPDATED',
          event_version: 1,
          aggregate_type: 'VERIFICATION_STATUS',
          aggregate_id: String(id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            account_id: dto.account_id,
            type: dto.type,
            status: dto.status,
          },
        },
        queryRunner,
      );

      return this.verificationStatusRepo.findById(id, queryRunner);
    });
  }

  // ── ONBOARDING PROGRESS ───────────────────────────────────────────────────────

  /** UpsertOnboardingProgress: upsert per (user_id, step_code) */
  async upsertOnboardingProgress(
    dto: OnboardingProgressUpsertDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const id = await this.onboardingProgressRepo.upsert(
        {
          user_id: dto.user_id,
          step_code: dto.step_code,
          state: dto.state,
          meta_json: dto.meta_json ?? null,
        },
        queryRunner,
      );

      await this.outboxService.enqueue(
        {
          event_name: 'ONBOARDING_STEP_UPDATED',
          event_version: 1,
          aggregate_type: 'ONBOARDING_PROGRESS',
          aggregate_id: String(id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            user_id: dto.user_id,
            step_code: dto.step_code,
            state: dto.state,
          },
        },
        queryRunner,
      );

      return this.onboardingProgressRepo.findById(id, queryRunner);
    });
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────────

  /**
   * Verify token or OTP:
   * - Magic-link: plain token equality check
   * - OTP: bcrypt comparison against stored hash
   */
  private async verifyTokenOrOtp(
    dtoToken: string | undefined,
    storedToken: string | null,
    otpPlain: string | undefined,
    otpHash: string | null,
  ): Promise<boolean> {
    if (dtoToken && storedToken && dtoToken === storedToken) return true;
    if (otpPlain && otpHash) return bcrypt.compare(otpPlain, otpHash);
    return false;
  }
}
