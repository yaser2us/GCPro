import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { OutboxService } from '../../../corekit/services/outbox.service';
import type { Actor } from '../../../corekit/types/actor.type';
import { UserReadRepository } from '../repositories/user-read.repo';
import { DeviceTokenRepository } from '../repositories/device-token.repo';
import { RegistrationTokenRepository } from '../repositories/registration-token.repo';
import { VerificationStatusRepository } from '../repositories/verification-status.repo';
import { OnboardingProgressRepository } from '../repositories/onboarding-progress.repo';
import { LoginDto } from '../dto/login.dto';
import { DeviceTokenRegisterDto } from '../dto/device-token-register.dto';
import { RegistrationTokenIssueDto } from '../dto/registration-token-issue.dto';
import { RegistrationTokenVerifyDto } from '../dto/registration-token-verify.dto';
import { VerificationStatusUpsertDto } from '../dto/verification-status-upsert.dto';
import { OnboardingProgressUpsertDto } from '../dto/onboarding-progress-upsert.dto';

/**
 * IdentityWorkflowService
 * Implements all 11 commands from specs/identity/identity.pillar.v2.yml.
 * Workflow discipline: guard → write → emit → commit (via withTxn).
 */
@Injectable()
export class IdentityWorkflowService {
  constructor(
    private readonly txService: TransactionService,
    private readonly outboxService: OutboxService,
    private readonly userReadRepo: UserReadRepository,
    private readonly deviceTokenRepo: DeviceTokenRepository,
    private readonly registrationTokenRepo: RegistrationTokenRepository,
    private readonly verificationStatusRepo: VerificationStatusRepository,
    private readonly onboardingProgressRepo: OnboardingProgressRepository,
  ) {}

  // ── AUTH ─────────────────────────────────────────────────────────────────────

  /**
   * Login — POST /v1/identity/login
   * Verify OTP via registration_token, consume token, upsert device_token.
   * Unauthenticated entry point — no auth guard required.
   */
  async login(dto: LoginDto, idempotencyKey: string) {
    return this.txService.run(async (queryRunner) => {
      // GUARD: user must exist
      const authUser = await this.userReadRepo.findByChannelValue(dto.channel_value, queryRunner);
      if (!authUser) throw new NotFoundException('USER_NOT_FOUND');

      // GUARD: user must be active
      if (authUser.status !== 'active') throw new ForbiddenException('USER_ACCOUNT_INACTIVE');

      // GUARD: pending login token must exist
      const regToken = await this.registrationTokenRepo.findLatestPendingByChannelAndPurpose(
        dto.channel_value,
        'login',
        queryRunner,
      );
      if (!regToken) throw new NotFoundException('REGISTRATION_TOKEN_NOT_FOUND');

      // GUARD: token must not be expired
      if (new Date(regToken.expires_at) <= new Date()) {
        throw new BadRequestException('REGISTRATION_TOKEN_EXPIRED');
      }

      // GUARD: OTP must be valid
      const otpValid = await this.verifyOtp(dto.otp_plain, regToken.otp_hash);
      if (!otpValid) throw new BadRequestException('REGISTRATION_TOKEN_INVALID');

      // WRITE: consume the registration token
      await this.registrationTokenRepo.update(regToken.id, { status: 'consumed' }, queryRunner);

      // WRITE: upsert device token (re-activate if same platform+token)
      const deviceTokenId = await this.deviceTokenRepo.upsert(
        {
          user_id: authUser.id,
          platform: dto.platform,
          token: dto.device_token,
          status: 'active',
          last_seen_at: new Date(),
        },
        queryRunner,
      );

      // EMIT
      await this.outboxService.enqueue(
        {
          event_name: 'USER_LOGGED_IN',
          event_version: 1,
          aggregate_type: 'DEVICE_TOKEN',
          aggregate_id: String(deviceTokenId),
          actor_user_id: String(authUser.id),
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            user_id: authUser.id,
            platform: dto.platform,
            channel_type: regToken.channel_type,
          },
        },
        queryRunner,
      );

      const sessionDevice = await this.deviceTokenRepo.findById(deviceTokenId, queryRunner);
      return { user: authUser, device_token: sessionDevice };
    });
  }

  /**
   * Logout — POST /v1/identity/logout
   * Revoke caller's own device token.
   */
  async logout(deviceTokenId: number, actor: Actor, idempotencyKey: string) {
    return this.txService.run(async (queryRunner) => {
      const deviceToken = await this.deviceTokenRepo.findById(deviceTokenId, queryRunner);

      // GUARD
      if (!deviceToken) throw new NotFoundException('DEVICE_TOKEN_NOT_FOUND');
      if (String(deviceToken.user_id) !== actor.actor_user_id) {
        throw new ForbiddenException('DEVICE_TOKEN_NOT_OWNED_BY_USER');
      }
      if (deviceToken.status === 'revoked') throw new ConflictException('DEVICE_TOKEN_ALREADY_REVOKED');

      // WRITE
      await this.deviceTokenRepo.update(deviceTokenId, { status: 'revoked' }, queryRunner);

      // EMIT
      await this.outboxService.enqueue(
        {
          event_name: 'USER_LOGGED_OUT',
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

  /**
   * GetCurrentUser — GET /v1/identity/me
   * Read-only query. No state changes, no events.
   */
  async getCurrentUser(actor: Actor) {
    const authUser = await this.userReadRepo.findById(Number(actor.actor_user_id));
    if (!authUser) throw new NotFoundException('USER_NOT_FOUND');
    return authUser;
  }

  // ── DEVICE TOKEN ─────────────────────────────────────────────────────────────

  /**
   * RegisterDevice — POST /v1/identity/device-tokens
   */
  async registerDevice(dto: DeviceTokenRegisterDto, actor: Actor, idempotencyKey: string) {
    return this.txService.run(async (queryRunner) => {
      const existing = await this.deviceTokenRepo.findByPlatformAndToken(dto.platform, dto.token, queryRunner);

      // GUARD
      if (existing && existing.user_id !== dto.user_id) {
        throw new ConflictException('DEVICE_TOKEN_OWNED_BY_ANOTHER_USER');
      }

      // WRITE
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

      // EMIT
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
          payload: { user_id: dto.user_id, platform: dto.platform, status: 'active' },
        },
        queryRunner,
      );

      return this.deviceTokenRepo.findById(id, queryRunner);
    });
  }

  /**
   * RevokeDevice — POST /v1/identity/device-tokens/:deviceTokenId/revoke
   */
  async revokeDevice(deviceTokenId: number, actor: Actor, idempotencyKey: string) {
    return this.txService.run(async (queryRunner) => {
      const deviceToken = await this.deviceTokenRepo.findById(deviceTokenId, queryRunner);

      // GUARD
      if (!deviceToken) throw new NotFoundException('DEVICE_TOKEN_NOT_FOUND');
      if (deviceToken.status === 'revoked') throw new ConflictException('DEVICE_TOKEN_ALREADY_REVOKED');

      // WRITE
      await this.deviceTokenRepo.update(deviceTokenId, { status: 'revoked' }, queryRunner);

      // EMIT
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
          payload: { user_id: deviceToken.user_id, platform: deviceToken.platform },
        },
        queryRunner,
      );

      return this.deviceTokenRepo.findById(deviceTokenId, queryRunner);
    });
  }

  // ── REGISTRATION TOKEN ────────────────────────────────────────────────────────

  /**
   * IssueRegistrationToken — POST /v1/identity/registration-tokens
   * Enforces 60-second OTP cooldown per channel_value.
   */
  async issueRegistrationToken(dto: RegistrationTokenIssueDto, actor: Actor, idempotencyKey: string) {
    return this.txService.run(async (queryRunner) => {
      // GUARD: OTP cooldown (60 seconds)
      const recentCount = await this.registrationTokenRepo.countRecentPending(
        dto.channel_value,
        60,
        queryRunner,
      );
      if (recentCount > 0) throw new ConflictException('REGISTRATION_TOKEN_COOLDOWN_ACTIVE');

      // WRITE
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

      // EMIT
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

  /**
   * VerifyRegistrationToken — POST /v1/identity/registration-tokens/:id/verify
   */
  async verifyRegistrationToken(
    registrationTokenId: number,
    dto: RegistrationTokenVerifyDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const regToken = await this.registrationTokenRepo.findById(registrationTokenId, queryRunner);

      // GUARD
      if (!regToken) throw new NotFoundException('REGISTRATION_TOKEN_NOT_FOUND');
      if (regToken.status !== 'pending') throw new ConflictException('REGISTRATION_TOKEN_NOT_PENDING');
      if (new Date(regToken.expires_at) <= new Date()) throw new BadRequestException('REGISTRATION_TOKEN_EXPIRED');

      const tokenValid = await this.verifyTokenOrOtp(dto.token, regToken.token, dto.otp_plain, regToken.otp_hash);
      if (!tokenValid) throw new BadRequestException('REGISTRATION_TOKEN_INVALID');

      // WRITE
      await this.registrationTokenRepo.update(registrationTokenId, { status: 'verified' }, queryRunner);

      // EMIT
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

  /**
   * ConsumeRegistrationToken — POST /v1/identity/registration-tokens/:id/consume
   */
  async consumeRegistrationToken(registrationTokenId: number, actor: Actor, idempotencyKey: string) {
    return this.txService.run(async (queryRunner) => {
      const regToken = await this.registrationTokenRepo.findById(registrationTokenId, queryRunner);

      // GUARD
      if (!regToken) throw new NotFoundException('REGISTRATION_TOKEN_NOT_FOUND');
      if (regToken.status !== 'verified') throw new ConflictException('REGISTRATION_TOKEN_NOT_VERIFIED');

      // WRITE
      await this.registrationTokenRepo.update(registrationTokenId, { status: 'consumed' }, queryRunner);

      // EMIT
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

  /**
   * ExpireRegistrationToken — POST /v1/identity/registration-tokens/:id/expire
   */
  async expireRegistrationToken(registrationTokenId: number, actor: Actor, idempotencyKey: string) {
    return this.txService.run(async (queryRunner) => {
      const regToken = await this.registrationTokenRepo.findById(registrationTokenId, queryRunner);

      // GUARD
      if (!regToken) throw new NotFoundException('REGISTRATION_TOKEN_NOT_FOUND');
      if (regToken.status !== 'pending' && regToken.status !== 'verified') {
        throw new ConflictException('REGISTRATION_TOKEN_ALREADY_TERMINAL');
      }

      // WRITE
      await this.registrationTokenRepo.update(registrationTokenId, { status: 'expired' }, queryRunner);

      // EMIT
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

  /**
   * UpsertVerificationStatus — POST /v1/identity/verification-status
   */
  async upsertVerificationStatus(dto: VerificationStatusUpsertDto, actor: Actor, idempotencyKey: string) {
    return this.txService.run(async (queryRunner) => {
      // WRITE
      const id = await this.verificationStatusRepo.upsert(
        {
          account_id: dto.account_id,
          type: dto.type,
          status: dto.status,
          meta_json: dto.meta_json ?? null,
        },
        queryRunner,
      );

      // EMIT
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
          payload: { account_id: dto.account_id, type: dto.type, status: dto.status },
        },
        queryRunner,
      );

      return this.verificationStatusRepo.findById(id, queryRunner);
    });
  }

  // ── ONBOARDING PROGRESS ───────────────────────────────────────────────────────

  /**
   * UpsertOnboardingProgress — POST /v1/identity/onboarding-progress
   */
  async upsertOnboardingProgress(dto: OnboardingProgressUpsertDto, actor: Actor, idempotencyKey: string) {
    return this.txService.run(async (queryRunner) => {
      // WRITE
      const id = await this.onboardingProgressRepo.upsert(
        {
          user_id: dto.user_id,
          step_code: dto.step_code,
          state: dto.state,
          meta_json: dto.meta_json ?? null,
        },
        queryRunner,
      );

      // EMIT
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
          payload: { user_id: dto.user_id, step_code: dto.step_code, state: dto.state },
        },
        queryRunner,
      );

      return this.onboardingProgressRepo.findById(id, queryRunner);
    });
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────────

  private async verifyOtp(otpPlain: string, otpHash: string | null): Promise<boolean> {
    if (!otpHash) return false;
    return bcrypt.compare(otpPlain, otpHash);
  }

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
