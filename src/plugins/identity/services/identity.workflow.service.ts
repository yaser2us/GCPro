import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { OutboxService } from '../../../corekit/services/outbox.service';
import { JwtService } from '../../../corekit/services/jwt.service';
import type { Actor } from '../../../corekit/types/actor.type';
import { UserReadRepository } from '../repositories/user-read.repo';
import { DeviceTokenRepository } from '../repositories/device-token.repo';
import { RegistrationTokenRepository } from '../repositories/registration-token.repo';
import { VerificationStatusRepository } from '../repositories/verification-status.repo';
import { OnboardingProgressRepository } from '../repositories/onboarding-progress.repo';
import { LoginDto } from '../dto/login.dto';
import { AuthLoginDto } from '../dto/auth-login.dto';
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
    private readonly jwtService: JwtService,
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
   * LoginWithPassword — POST /v1/auth/login
   * C1: Accepts phone_number + password, verifies bcrypt hash, returns signed JWT.
   * Unauthenticated entry point — no auth guard required.
   */
  async loginWithPassword(dto: AuthLoginDto) {
    return this.txService.run(async (queryRunner) => {
      // GUARD: user must exist
      const authUser = await this.userReadRepo.findByPhoneNumber(dto.phone_number, queryRunner);
      if (!authUser) throw new UnauthorizedException('INVALID_CREDENTIALS');

      // GUARD: user must be active
      if (authUser.status !== 'active') throw new ForbiddenException('USER_ACCOUNT_INACTIVE');

      // GUARD: password credential must exist
      const [credential] = await queryRunner.manager.query(
        `SELECT id, secret_hash FROM user_credential WHERE user_id = ? AND type = 'password' LIMIT 1`,
        [authUser.id],
      );
      if (!credential || !credential.secret_hash) throw new UnauthorizedException('INVALID_CREDENTIALS');

      // GUARD: password must match
      const passwordValid = await bcrypt.compare(dto.password, credential.secret_hash);
      if (!passwordValid) throw new UnauthorizedException('INVALID_CREDENTIALS');

      // Resolve account_id via raw SQL (user_account table, person plugin owns it)
      const [accountRow] = await queryRunner.manager.query(
        `SELECT id FROM account WHERE primary_user_id = ? AND status = 'active' LIMIT 1`,
        [authUser.id],
      ).catch(() => [null]);

      // Resolve roles from role_assignment (raw SQL, no cross-module dep)
      const roleRows: { code: string }[] = await queryRunner.manager.query(
        `SELECT r.code FROM role_assignment ra JOIN role r ON r.id = ra.role_id
         WHERE ra.user_id = ? AND (ra.expires_at IS NULL OR ra.expires_at > NOW())`,
        [authUser.id],
      ).catch(() => []);

      const roles = roleRows.map((r) => r.code);
      const account_id: number | null = accountRow ? Number(accountRow.id) : null;

      // Sign JWT
      const token = this.jwtService.sign({
        user_id: authUser.id,
        account_id,
        roles,
        permissions: [],
      });

      // EMIT
      await this.outboxService.enqueue(
        {
          event_name: 'USER_LOGGED_IN',
          event_version: 1,
          aggregate_type: 'USER',
          aggregate_id: String(authUser.id),
          actor_user_id: String(authUser.id),
          occurred_at: new Date(),
          correlation_id: String(authUser.id),
          causation_id: String(authUser.id),
          payload: {
            user_id: authUser.id,
            auth_method: 'password',
          },
        },
        queryRunner,
      );

      return {
        access_token: token,
        token_type: 'Bearer',
        user: { id: authUser.id, phone_number: authUser.phone_number, status: authUser.status },
      };
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
      // GUARD (M7 + C2): Registration-specific gates
      if (!dto.purpose || dto.purpose === 'registration') {
        // C2: invite_code is required and must be a valid active invite code
        if (!dto.invite_code) throw new BadRequestException('INVITE_CODE_REQUIRED');
        const inviteValid = await this.isValidInviteCode(dto.invite_code, queryRunner);
        if (!inviteValid) throw new ConflictException('INVITE_CODE_INVALID');

        // M7: user (if already in DB) must have accepted T&C
        const user = await this.userReadRepo.findByChannelValue(dto.channel_value, queryRunner);
        if (user) {
          const accepted = await this.hasAcceptedTerms(user.id, queryRunner);
          if (!accepted) throw new ConflictException('TERMS_NOT_ACCEPTED');
        }
      }

      // GUARD: OTP cooldown (60 seconds)
      const recentCount = await this.registrationTokenRepo.countRecentPending(
        dto.channel_value,
        60,
        queryRunner,
      );
      if (recentCount > 0) throw new ConflictException('REGISTRATION_TOKEN_COOLDOWN_ACTIVE');

      // Generate OTP server-side when neither token nor otp_hash is provided
      let otp_plain: string | null = null;
      let otp_hash = dto.otp_hash ?? null;
      if (!dto.token && !dto.otp_hash) {
        otp_plain = Math.floor(100000 + Math.random() * 900000).toString();
        otp_hash = await bcrypt.hash(otp_plain, 10);
      }

      // WRITE
      const id = await this.registrationTokenRepo.insert(
        {
          purpose: dto.purpose ?? 'registration',
          channel_type: dto.channel_type,
          channel_value: dto.channel_value,
          invite_code: dto.invite_code ?? null,
          token: dto.token ?? null,
          otp_hash,
          status: 'pending',
          meta_json: dto.meta_json ?? null,
          expires_at: new Date(dto.expires_at),
        },
        queryRunner,
      );

      const result = await this.registrationTokenRepo.findById(id, queryRunner);

      // EMIT — include otp_plain only when server-generated (not caller-hashed or magic-link)
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
            registration_token_id: id,
            purpose: result!.purpose,
            channel_type: result!.channel_type,
            channel_value: result!.channel_value,
            expires_at: result!.expires_at,
            ...(otp_plain ? { otp_plain } : {}),
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

  /**
   * C2 — check that the invite code exists in referral_code with code_type='invite'
   * and status='active'. Raw SQL; no cross-module dependency.
   */
  private async isValidInviteCode(inviteCode: string, queryRunner: import('typeorm').QueryRunner): Promise<boolean> {
    const rows = await queryRunner.manager.query(
      `SELECT id FROM referral_code
       WHERE code = ? AND code_type = 'invite' AND status = 'active'
       LIMIT 1`,
      [inviteCode],
    );
    return rows.length > 0;
  }

  /**
   * M7 — check if the user has accepted the active published T&C version.
   * Uses a raw SQL cross-join; no FoundationModule dependency needed.
   */
  private async hasAcceptedTerms(userId: number, queryRunner: import('typeorm').QueryRunner): Promise<boolean> {
    const rows = await queryRunner.manager.query(
      `SELECT ga.id
       FROM guideline_acceptance ga
       JOIN guideline_version gv ON ga.version_id = gv.id
       JOIN guideline_document gd ON gv.document_id = gd.id
       WHERE ga.user_id = ?
         AND gd.code = 'gc:terms'
         AND gv.status = 'published'
         AND (gv.effective_to IS NULL OR gv.effective_to > NOW())
       LIMIT 1`,
      [userId],
    );
    return rows.length > 0;
  }

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
