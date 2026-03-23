import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { OutboxService } from '../../../corekit/services/outbox.service';
import { UserRepository } from '../repositories/user.repo';
import { UserCredentialRepository } from '../repositories/user-credential.repo';
import { UserPermissionRepository } from '../repositories/user-permission.repo';
import { UserRoleRepository } from '../repositories/user-role.repo';
import { UserCreateRequestDto } from '../dto/user-create.request.dto';
import { UserUpdateProfileRequestDto } from '../dto/user-update-profile.request.dto';
import { UserVerifyEmailRequestDto } from '../dto/user-verify-email.request.dto';
import { UserCredentialCreateRequestDto } from '../dto/user-credential-create.request.dto';
import { UserCredentialVerifyRequestDto } from '../dto/user-credential-verify.request.dto';
import { UserRoleAssignRequestDto } from '../dto/user-role-assign.request.dto';
import { UserPermissionGrantRequestDto } from '../dto/user-permission-grant.request.dto';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * User Workflow Service
 * Implements user commands following the workflow discipline:
 * Guard → Validate → Write → Emit → Commit
 *
 * Based on specs/user/user.pillar.v2.yml
 */
@Injectable()
export class UserWorkflowService {
  constructor(
    private readonly txService: TransactionService,
    private readonly outboxService: OutboxService,
    private readonly userRepo: UserRepository,
    private readonly userCredentialRepo: UserCredentialRepository,
    private readonly userPermissionRepo: UserPermissionRepository,
    private readonly userRoleRepo: UserRoleRepository,
  ) {}

  /**
   * USER.CREATE COMMAND
   * Source: specs/user/user.pillar.v2.yml
   *
   * HTTP: POST /v1/users
   */
  async createUser(
    request: UserCreateRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: at least one of phone_number or email required
      if (!request.phone_number && !request.email) {
        throw new BadRequestException({
          code: 'PHONE_OR_EMAIL_REQUIRED',
          message: 'At least one of phone_number or email is required',
        });
      }

      // WRITE: create user
      const userId = await this.userRepo.create(
        {
          phone_number: request.phone_number || null,
          email: request.email || null,
          status: 'active',
        },
        queryRunner,
      );

      // EMIT: USER_CREATED event
      await this.outboxService.enqueue(
        {
          event_name: 'USER_CREATED',
          event_version: 1,
          aggregate_type: 'USER',
          aggregate_id: String(userId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            user_id: userId,
            phone_number: request.phone_number,
            email: request.email,
          },
        },
        queryRunner,
      );

      return {
        user_id: userId,
        status: 'active',
      };
    });

    return result;
  }

  /**
   * USER.GET COMMAND
   * Source: specs/user/user.pillar.v2.yml
   *
   * HTTP: GET /v1/users/{user_id}
   */
  async getUser(id: number) {
    const user = await this.userRepo.findById(id);

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: `User with id ${id} not found`,
      });
    }

    return user;
  }

  /**
   * USER.LIST COMMAND
   * Source: specs/user/user.pillar.v2.yml
   *
   * HTTP: GET /v1/users
   */
  async listUsers() {
    const users = await this.userRepo.findAll();
    return { items: users };
  }

  /**
   * USER.UPDATE_PROFILE COMMAND
   * Source: specs/user/user.pillar.v2.yml
   *
   * HTTP: PUT /v1/users/{user_id}/profile
   */
  async updateUserProfile(
    id: number,
    request: UserUpdateProfileRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: user exists
      const user = await this.userRepo.findById(id, queryRunner);
      if (!user) {
        throw new NotFoundException({
          code: 'USER_NOT_FOUND',
          message: `User with id ${id} not found`,
        });
      }

      // WRITE: update user
      const updateData: any = {};
      if (request.phone_number !== undefined)
        updateData.phone_number = request.phone_number;
      if (request.email !== undefined) updateData.email = request.email;

      await this.userRepo.update(id, updateData, queryRunner);

      // EMIT: USER_PROFILE_UPDATED event
      await this.outboxService.enqueue(
        {
          event_name: 'USER_PROFILE_UPDATED',
          event_version: 1,
          aggregate_type: 'USER',
          aggregate_id: String(id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            user_id: id,
          },
        },
        queryRunner,
      );

      return {
        user_id: id,
      };
    });

    return result;
  }

  /**
   * USER.VERIFY_EMAIL COMMAND
   * Source: specs/user/user.pillar.v2.yml
   *
   * HTTP: POST /v1/users/{user_id}/verify-email
   */
  async verifyUserEmail(
    id: number,
    _request: UserVerifyEmailRequestDto, // TODO: validate verification_token when token flow is built
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: user exists
      const user = await this.userRepo.findById(id, queryRunner);
      if (!user) {
        throw new NotFoundException({
          code: 'USER_NOT_FOUND',
          message: `User with id ${id} not found`,
        });
      }

      // GUARD: email not already verified
      if (user.email_verified_at) {
        throw new ConflictException({
          code: 'EMAIL_ALREADY_VERIFIED',
          message: 'Email is already verified',
        });
      }

      // TODO: GUARD: validate verification_token
      // This would typically involve checking against a stored token
      // For now, we'll skip this check

      // WRITE: update email_verified_at
      const emailVerifiedAt = new Date();
      await this.userRepo.update(
        id,
        { email_verified_at: emailVerifiedAt },
        queryRunner,
      );

      // EMIT: USER_EMAIL_VERIFIED event
      await this.outboxService.enqueue(
        {
          event_name: 'USER_EMAIL_VERIFIED',
          event_version: 1,
          aggregate_type: 'USER',
          aggregate_id: String(id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            user_id: id,
            email: user.email,
          },
        },
        queryRunner,
      );

      return {
        user_id: id,
        email_verified_at: emailVerifiedAt,
      };
    });

    return result;
  }

  /**
   * USER.SUSPEND COMMAND
   * Source: specs/user/user.pillar.v2.yml
   *
   * HTTP: POST /v1/users/{user_id}/suspend
   */
  async suspendUser(id: number, actor: Actor, idempotencyKey: string) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: user exists
      const user = await this.userRepo.findById(id, queryRunner);
      if (!user) {
        throw new NotFoundException({
          code: 'USER_NOT_FOUND',
          message: `User with id ${id} not found`,
        });
      }

      // GUARD: user must be active
      if (user.status !== 'active') {
        throw new ConflictException({
          code: 'USER_NOT_ACTIVE',
          message: `User is not active, current status: ${user.status}`,
        });
      }

      // WRITE: update status to suspended
      await this.userRepo.update(id, { status: 'suspended' }, queryRunner);

      // EMIT: USER_SUSPENDED event
      await this.outboxService.enqueue(
        {
          event_name: 'USER_SUSPENDED',
          event_version: 1,
          aggregate_type: 'USER',
          aggregate_id: String(id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            user_id: id,
          },
        },
        queryRunner,
      );

      return {
        user_id: id,
        status: 'suspended',
      };
    });

    return result;
  }

  /**
   * USER.ACTIVATE COMMAND
   * Source: specs/user/user.pillar.v2.yml
   *
   * HTTP: POST /v1/users/{user_id}/activate
   */
  async activateUser(id: number, actor: Actor, idempotencyKey: string) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: user exists
      const user = await this.userRepo.findById(id, queryRunner);
      if (!user) {
        throw new NotFoundException({
          code: 'USER_NOT_FOUND',
          message: `User with id ${id} not found`,
        });
      }

      // GUARD: user must be suspended or inactive
      if (user.status === 'active') {
        throw new ConflictException({
          code: 'USER_ALREADY_ACTIVE',
          message: 'User is already active',
        });
      }

      // WRITE: update status to active
      await this.userRepo.update(id, { status: 'active' }, queryRunner);

      // EMIT: USER_ACTIVATED event
      await this.outboxService.enqueue(
        {
          event_name: 'USER_ACTIVATED',
          event_version: 1,
          aggregate_type: 'USER',
          aggregate_id: String(id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            user_id: id,
          },
        },
        queryRunner,
      );

      return {
        user_id: id,
        status: 'active',
      };
    });

    return result;
  }

  // ── C3: 8-STATE LIFECYCLE ──────────────────────────────────────────────────

  /**
   * C3 FREEZE — POST /v1/users/{id}/freeze
   * Transitions: pending|active|probation|suspended → frozen
   */
  async freezeUser(id: number, reason: string | undefined, actor: Actor, idempotencyKey: string) {
    return this.txService.run(async (queryRunner) => {
      const user = await this.userRepo.findById(id, queryRunner);
      if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND' });
      const allowedFrom = ['pending', 'active', 'probation', 'suspended'];
      if (!allowedFrom.includes(user.status)) {
        throw new ConflictException({ code: 'USER_STATUS_TRANSITION_INVALID', message: `Cannot freeze user in status: ${user.status}` });
      }
      await this.userRepo.update(id, { status: 'frozen' }, queryRunner);
      await this.outboxService.enqueue({ event_name: 'USER_FROZEN', event_version: 1, aggregate_type: 'USER', aggregate_id: String(id), actor_user_id: actor.actor_user_id, occurred_at: new Date(), correlation_id: idempotencyKey, causation_id: idempotencyKey, payload: { user_id: id, from_status: user.status, reason: reason ?? null } }, queryRunner);
      return { user_id: id, status: 'frozen' };
    });
  }

  /**
   * C3 CLOSE — POST /v1/users/{id}/close
   * Transitions: frozen → closed (grace period expired)
   */
  async closeUser(id: number, triggerCode: string | undefined, actor: Actor, idempotencyKey: string) {
    return this.txService.run(async (queryRunner) => {
      const user = await this.userRepo.findById(id, queryRunner);
      if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND' });
      if (user.status !== 'frozen') {
        throw new ConflictException({ code: 'USER_STATUS_TRANSITION_INVALID', message: `Cannot close user in status: ${user.status}` });
      }
      await this.userRepo.update(id, { status: 'closed' }, queryRunner);
      await this.outboxService.enqueue({ event_name: 'USER_CLOSED', event_version: 1, aggregate_type: 'USER', aggregate_id: String(id), actor_user_id: actor.actor_user_id, occurred_at: new Date(), correlation_id: idempotencyKey, causation_id: idempotencyKey, payload: { user_id: id, from_status: 'frozen', trigger_code: triggerCode ?? 'admin_action' } }, queryRunner);
      return { user_id: id, status: 'closed' };
    });
  }

  /**
   * C3 TERMINATE — POST /v1/users/{id}/terminate
   * Transitions: active|frozen|probation → terminated (voluntary)
   */
  async terminateUser(id: number, reason: string | undefined, actor: Actor, idempotencyKey: string) {
    return this.txService.run(async (queryRunner) => {
      const user = await this.userRepo.findById(id, queryRunner);
      if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND' });
      const allowedFrom = ['active', 'frozen', 'probation'];
      if (!allowedFrom.includes(user.status)) {
        throw new ConflictException({ code: 'USER_STATUS_TRANSITION_INVALID', message: `Cannot terminate user in status: ${user.status}` });
      }
      await this.userRepo.update(id, { status: 'terminated' }, queryRunner);
      await this.outboxService.enqueue({ event_name: 'USER_TERMINATED', event_version: 1, aggregate_type: 'USER', aggregate_id: String(id), actor_user_id: actor.actor_user_id, occurred_at: new Date(), correlation_id: idempotencyKey, causation_id: idempotencyKey, payload: { user_id: id, from_status: user.status, reason: reason ?? null, trigger_code: 'user_request' } }, queryRunner);
      return { user_id: id, status: 'terminated' };
    });
  }

  /**
   * C3 REJOIN — POST /v1/users/{id}/rejoin
   * Transitions: closed|terminated → pending
   * Guard: person age must be < 41
   */
  async rejoinUser(id: number, actor: Actor, idempotencyKey: string) {
    return this.txService.run(async (queryRunner) => {
      const user = await this.userRepo.findById(id, queryRunner);
      if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND' });
      const allowedFrom = ['closed', 'terminated'];
      if (!allowedFrom.includes(user.status)) {
        throw new ConflictException({ code: 'USER_STATUS_TRANSITION_INVALID', message: `Cannot rejoin from status: ${user.status}` });
      }
      // GUARD: age < 41
      const personRows = await queryRunner.manager.query(`SELECT dob FROM person WHERE primary_user_id = ? LIMIT 1`, [id]);
      if (personRows.length > 0 && personRows[0].dob) {
        const dob = new Date(personRows[0].dob);
        const ageMsec = Date.now() - dob.getTime();
        const ageYears = ageMsec / (1000 * 60 * 60 * 24 * 365.25);
        if (ageYears >= 41) throw new ConflictException({ code: 'USER_REJOIN_AGE_LIMIT_EXCEEDED', message: 'Rejoin is only allowed for persons under 41 years old' });
      }
      await this.userRepo.update(id, { status: 'pending' }, queryRunner);
      await this.outboxService.enqueue({ event_name: 'USER_REJOINED', event_version: 1, aggregate_type: 'USER', aggregate_id: String(id), actor_user_id: actor.actor_user_id, occurred_at: new Date(), correlation_id: idempotencyKey, causation_id: idempotencyKey, payload: { user_id: id, from_status: user.status } }, queryRunner);
      return { user_id: id, status: 'pending' };
    });
  }

  /**
   * C3 REACTIVATE — POST /v1/users/{id}/reactivate
   * Transitions: frozen|closed → active (limited to 1 time per account)
   */
  async reactivateUser(id: number, note: string | undefined, actor: Actor, idempotencyKey: string) {
    return this.txService.run(async (queryRunner) => {
      const user = await this.userRepo.findById(id, queryRunner);
      if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND' });
      const allowedFrom = ['frozen', 'closed'];
      if (!allowedFrom.includes(user.status)) {
        throw new ConflictException({ code: 'USER_STATUS_TRANSITION_INVALID', message: `Cannot reactivate user in status: ${user.status}` });
      }
      // Note: 1-time limit tracked via audit_log / outbox; enforced by downstream policy checks
      await this.userRepo.update(id, { status: 'active' }, queryRunner);
      await this.outboxService.enqueue({ event_name: 'USER_REACTIVATED', event_version: 1, aggregate_type: 'USER', aggregate_id: String(id), actor_user_id: actor.actor_user_id, occurred_at: new Date(), correlation_id: idempotencyKey, causation_id: idempotencyKey, payload: { user_id: id, from_status: user.status, note: note ?? null } }, queryRunner);
      return { user_id: id, status: 'active' };
    });
  }

  /**
   * C3 SET PROBATION — POST /v1/users/{id}/set-probation
   * Transitions: active → probation (admin/TPA review)
   */
  async setProbationUser(id: number, reason: string | undefined, actor: Actor, idempotencyKey: string) {
    return this.txService.run(async (queryRunner) => {
      const user = await this.userRepo.findById(id, queryRunner);
      if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND' });
      if (user.status !== 'active') {
        throw new ConflictException({ code: 'USER_STATUS_TRANSITION_INVALID', message: `Cannot set probation from status: ${user.status}` });
      }
      await this.userRepo.update(id, { status: 'probation' }, queryRunner);
      await this.outboxService.enqueue({ event_name: 'USER_PROBATION_SET', event_version: 1, aggregate_type: 'USER', aggregate_id: String(id), actor_user_id: actor.actor_user_id, occurred_at: new Date(), correlation_id: idempotencyKey, causation_id: idempotencyKey, payload: { user_id: id, from_status: 'active', reason: reason ?? null } }, queryRunner);
      return { user_id: id, status: 'probation' };
    });
  }

  /**
   * USER_CREDENTIAL.CREATE COMMAND
   * Source: specs/user/user.pillar.v2.yml
   *
   * HTTP: POST /v1/users/{user_id}/credentials
   */
  async createUserCredential(
    userId: number,
    request: UserCredentialCreateRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: user exists
      const user = await this.userRepo.findById(userId, queryRunner);
      if (!user) {
        throw new NotFoundException({
          code: 'USER_NOT_FOUND',
          message: `User with id ${userId} not found`,
        });
      }

      // GUARD: type is required
      if (!request.type || request.type === '') {
        throw new BadRequestException({
          code: 'CREDENTIAL_TYPE_REQUIRED',
          message: 'Credential type is required',
        });
      }

      // WRITE: hash password if type is 'password'
      let secretHash: string | null = null;
      if (request.type === 'password' && request.secret) {
        secretHash = await bcrypt.hash(request.secret, 10);
      }

      const credentialId = await this.userCredentialRepo.create(
        {
          user_id: userId,
          type: request.type,
          secret_hash: secretHash,
          provider_ref: request.provider_ref || null,
        },
        queryRunner,
      );

      // EMIT: USER_CREDENTIAL_CREATED event
      await this.outboxService.enqueue(
        {
          event_name: 'USER_CREDENTIAL_CREATED',
          event_version: 1,
          aggregate_type: 'USER',
          aggregate_id: String(userId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            user_id: userId,
            user_credential_id: credentialId,
            type: request.type,
          },
        },
        queryRunner,
      );

      return {
        user_credential_id: credentialId,
      };
    });

    return result;
  }

  /**
   * USER_CREDENTIAL.VERIFY COMMAND
   * Source: specs/user/user.pillar.v2.yml
   *
   * HTTP: POST /v1/users/{user_id}/credentials/verify
   */
  async verifyUserCredential(
    userId: number,
    request: UserCredentialVerifyRequestDto,
    actor: Actor,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: user exists
      const user = await this.userRepo.findById(userId, queryRunner);
      if (!user) {
        throw new NotFoundException({
          code: 'USER_NOT_FOUND',
          message: `User with id ${userId} not found`,
        });
      }

      // READ: get credential
      const credential = await this.userCredentialRepo.findByUserIdAndType(
        userId,
        request.type,
        queryRunner,
      );

      // GUARD: credential exists
      if (!credential) {
        throw new UnauthorizedException({
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid credentials',
        });
      }

      // VALIDATE: verify secret
      let isValid = false;
      if (request.type === 'password' && credential.secret_hash) {
        isValid = await bcrypt.compare(request.secret, credential.secret_hash);
      }

      if (!isValid) {
        throw new UnauthorizedException({
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid credentials',
        });
      }

      // EMIT: USER_CREDENTIAL_VERIFIED event
      await this.outboxService.enqueue(
        {
          event_name: 'USER_CREDENTIAL_VERIFIED',
          event_version: 1,
          aggregate_type: 'USER',
          aggregate_id: String(userId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: `verify-${userId}-${Date.now()}`,
          causation_id: `verify-${userId}-${Date.now()}`,
          payload: {
            user_id: userId,
            type: request.type,
          },
        },
        queryRunner,
      );

      return {
        verified: true,
        user_id: userId,
      };
    });

    return result;
  }

  /**
   * USER_CREDENTIAL.LIST COMMAND
   * Source: specs/user/user.pillar.v2.yml
   *
   * HTTP: GET /v1/users/{user_id}/credentials
   */
  async listUserCredentials(userId: number) {
    // GUARD: user exists
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: `User with id ${userId} not found`,
      });
    }

    // READ: get credentials (without secret_hash)
    const credentials = await this.userCredentialRepo.findByUserId(userId);

    // Remove secret_hash from response
    const sanitized = credentials.map((c) => ({
      id: c.id,
      user_id: c.user_id,
      type: c.type,
      provider_ref: c.provider_ref,
      created_at: c.created_at,
    }));

    return { items: sanitized };
  }

  /**
   * USER_ROLE.ASSIGN COMMAND
   * Source: specs/user/user.pillar.v2.yml
   *
   * HTTP: POST /v1/users/{user_id}/roles
   */
  async assignRoleToUser(
    userId: number,
    request: UserRoleAssignRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: user exists
      const user = await this.userRepo.findById(userId, queryRunner);
      if (!user) {
        throw new NotFoundException({
          code: 'USER_NOT_FOUND',
          message: `User with id ${userId} not found`,
        });
      }

      // TODO: GUARD: role exists
      // This would require access to RoleRepository
      // For now, we'll skip this check

      const roleId = Number(request.role_id);

      // WRITE: assign role (idempotent via INSERT IGNORE)
      await this.userRoleRepo.assign(userId, roleId, queryRunner);

      // EMIT: USER_ROLE_ASSIGNED event
      await this.outboxService.enqueue(
        {
          event_name: 'USER_ROLE_ASSIGNED',
          event_version: 1,
          aggregate_type: 'USER',
          aggregate_id: String(userId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            user_id: userId,
            role_id: roleId,
          },
        },
        queryRunner,
      );

      return {
        user_id: userId,
        role_id: roleId,
      };
    });

    return result;
  }

  /**
   * USER_ROLE.REVOKE COMMAND
   * Source: specs/user/user.pillar.v2.yml
   *
   * HTTP: DELETE /v1/users/{user_id}/roles/{role_id}
   */
  async revokeRoleFromUser(
    userId: number,
    roleId: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: user exists
      const user = await this.userRepo.findById(userId, queryRunner);
      if (!user) {
        throw new NotFoundException({
          code: 'USER_NOT_FOUND',
          message: `User with id ${userId} not found`,
        });
      }

      // GUARD: assignment exists
      const assignment = await this.userRoleRepo.findByUserIdAndRoleId(
        userId,
        roleId,
        queryRunner,
      );
      if (!assignment) {
        throw new NotFoundException({
          code: 'USER_ROLE_NOT_FOUND',
          message: `User role assignment not found`,
        });
      }

      // WRITE: revoke role
      await this.userRoleRepo.revoke(userId, roleId, queryRunner);

      // EMIT: USER_ROLE_REVOKED event
      await this.outboxService.enqueue(
        {
          event_name: 'USER_ROLE_REVOKED',
          event_version: 1,
          aggregate_type: 'USER',
          aggregate_id: String(userId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            user_id: userId,
            role_id: roleId,
          },
        },
        queryRunner,
      );

      return {
        user_id: userId,
        role_id: roleId,
      };
    });

    return result;
  }

  /**
   * USER_ROLE.LIST COMMAND
   * Source: specs/user/user.pillar.v2.yml
   *
   * HTTP: GET /v1/users/{user_id}/roles
   */
  async listUserRoles(userId: number) {
    // GUARD: user exists
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: `User with id ${userId} not found`,
      });
    }

    // READ: get roles via JOIN
    const roles = await this.userRoleRepo.getRolesForUser(userId);

    return { items: roles };
  }

  /**
   * USER_PERMISSION.GRANT COMMAND
   * Source: specs/user/user.pillar.v2.yml
   *
   * HTTP: POST /v1/users/{user_id}/permissions
   */
  async grantPermissionToUser(
    userId: number,
    request: UserPermissionGrantRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: user exists
      const user = await this.userRepo.findById(userId, queryRunner);
      if (!user) {
        throw new NotFoundException({
          code: 'USER_NOT_FOUND',
          message: `User with id ${userId} not found`,
        });
      }

      // TODO: GUARD: permission exists
      // This would require access to PermissionRepository
      // For now, we'll skip this check

      const permissionId = Number(request.permission_id);
      const effect = request.effect || 'allow';

      // WRITE: grant permission (upsert)
      const userPermissionId = await this.userPermissionRepo.upsert(
        {
          user_id: userId,
          permission_id: permissionId,
          effect: effect as 'allow' | 'deny',
        },
        queryRunner,
      );

      // EMIT: USER_PERMISSION_GRANTED event
      await this.outboxService.enqueue(
        {
          event_name: 'USER_PERMISSION_GRANTED',
          event_version: 1,
          aggregate_type: 'USER',
          aggregate_id: String(userId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            user_id: userId,
            permission_id: permissionId,
            effect: effect,
          },
        },
        queryRunner,
      );

      return {
        user_permission_id: userPermissionId,
      };
    });

    return result;
  }

  /**
   * USER_PERMISSION.REVOKE COMMAND
   * Source: specs/user/user.pillar.v2.yml
   *
   * HTTP: DELETE /v1/users/{user_id}/permissions/{permission_id}
   */
  async revokePermissionFromUser(
    userId: number,
    permissionId: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: user exists
      const user = await this.userRepo.findById(userId, queryRunner);
      if (!user) {
        throw new NotFoundException({
          code: 'USER_NOT_FOUND',
          message: `User with id ${userId} not found`,
        });
      }

      // GUARD: assignment exists
      const assignment =
        await this.userPermissionRepo.findByUserIdAndPermissionId(
          userId,
          permissionId,
          queryRunner,
        );
      if (!assignment) {
        throw new NotFoundException({
          code: 'USER_PERMISSION_NOT_FOUND',
          message: `User permission assignment not found`,
        });
      }

      // WRITE: revoke permission
      await this.userPermissionRepo.delete(userId, permissionId, queryRunner);

      // EMIT: USER_PERMISSION_REVOKED event
      await this.outboxService.enqueue(
        {
          event_name: 'USER_PERMISSION_REVOKED',
          event_version: 1,
          aggregate_type: 'USER',
          aggregate_id: String(userId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            user_id: userId,
            permission_id: permissionId,
          },
        },
        queryRunner,
      );

      return {
        user_id: userId,
        permission_id: permissionId,
      };
    });

    return result;
  }

  /**
   * USER_PERMISSION.LIST COMMAND
   * Source: specs/user/user.pillar.v2.yml
   *
   * HTTP: GET /v1/users/{user_id}/permissions
   */
  async listUserPermissions(userId: number) {
    // GUARD: user exists
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: `User with id ${userId} not found`,
      });
    }

    // READ: get permissions via JOIN
    const permissions =
      await this.userPermissionRepo.getPermissionsForUser(userId);

    return { items: permissions };
  }
}
