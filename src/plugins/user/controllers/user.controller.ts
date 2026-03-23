import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { UserWorkflowService } from '../services/user.workflow.service';
import { UserCreateRequestDto } from '../dto/user-create.request.dto';
import { UserUpdateProfileRequestDto } from '../dto/user-update-profile.request.dto';
import { UserVerifyEmailRequestDto } from '../dto/user-verify-email.request.dto';
import { UserCredentialCreateRequestDto } from '../dto/user-credential-create.request.dto';
import { UserCredentialVerifyRequestDto } from '../dto/user-credential-verify.request.dto';
import { UserRoleAssignRequestDto } from '../dto/user-role-assign.request.dto';
import { UserPermissionGrantRequestDto } from '../dto/user-permission-grant.request.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * User Controller
 * Handles HTTP endpoints for user operations
 *
 * Based on specs/user/user.pillar.v2.yml commands section
 */
@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class UserController {
  constructor(private readonly workflowService: UserWorkflowService) {}

  // ──────────────────────────────────────────────────────────────────────────
  // USER ENDPOINTS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * CREATE USER
   * POST /v1/users
   */
  @Post('v1/users')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('user:admin', 'user:manage')
  async createUser(
    @Body() request: UserCreateRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.createUser(request, actor, idempotencyKey);
  }

  /**
   * GET USER
   * GET /v1/users/:user_id
   */
  @Get('v1/users/:user_id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('user:read')
  async getUser(@Param('user_id') userId: string) {
    return this.workflowService.getUser(Number(userId));
  }

  /**
   * LIST USERS
   * GET /v1/users
   */
  @Get('v1/users')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('user:read')
  async listUsers() {
    return this.workflowService.listUsers();
  }

  /**
   * UPDATE USER PROFILE
   * PUT /v1/users/:user_id/profile
   */
  @Put('v1/users/:user_id/profile')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('user:admin', 'user:manage')
  async updateUserProfile(
    @Param('user_id') userId: string,
    @Body() request: UserUpdateProfileRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.updateUserProfile(
      Number(userId),
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * VERIFY USER EMAIL
   * POST /v1/users/:user_id/verify-email
   */
  @Post('v1/users/:user_id/verify-email')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('user:admin', 'user:manage')
  async verifyUserEmail(
    @Param('user_id') userId: string,
    @Body() request: UserVerifyEmailRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.verifyUserEmail(
      Number(userId),
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * SUSPEND USER
   * POST /v1/users/:user_id/suspend
   */
  @Post('v1/users/:user_id/suspend')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('user:admin')
  async suspendUser(
    @Param('user_id') userId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.suspendUser(
      Number(userId),
      actor,
      idempotencyKey,
    );
  }

  /**
   * ACTIVATE USER
   * POST /v1/users/:user_id/activate
   */
  @Post('v1/users/:user_id/activate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('user:admin')
  async activateUser(
    @Param('user_id') userId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.activateUser(
      Number(userId),
      actor,
      idempotencyKey,
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // C3: 8-STATE LIFECYCLE ENDPOINTS
  // ──────────────────────────────────────────────────────────────────────────

  /** POST /v1/users/:user_id/freeze */
  @Post('v1/users/:user_id/freeze')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('user:admin')
  async freezeUser(
    @Param('user_id') userId: string,
    @Body() body: { reason?: string },
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    return this.workflowService.freezeUser(Number(userId), body?.reason, actor, idempotencyKey);
  }

  /** POST /v1/users/:user_id/close */
  @Post('v1/users/:user_id/close')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('user:admin')
  async closeUser(
    @Param('user_id') userId: string,
    @Body() body: { trigger_code?: string },
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    return this.workflowService.closeUser(Number(userId), body?.trigger_code, actor, idempotencyKey);
  }

  /** POST /v1/users/:user_id/terminate */
  @Post('v1/users/:user_id/terminate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('user:admin')
  async terminateUser(
    @Param('user_id') userId: string,
    @Body() body: { reason?: string },
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    return this.workflowService.terminateUser(Number(userId), body?.reason, actor, idempotencyKey);
  }

  /** POST /v1/users/:user_id/rejoin */
  @Post('v1/users/:user_id/rejoin')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('user:admin')
  async rejoinUser(
    @Param('user_id') userId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    return this.workflowService.rejoinUser(Number(userId), actor, idempotencyKey);
  }

  /** POST /v1/users/:user_id/reactivate */
  @Post('v1/users/:user_id/reactivate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('user:admin')
  async reactivateUser(
    @Param('user_id') userId: string,
    @Body() body: { note?: string },
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    return this.workflowService.reactivateUser(Number(userId), body?.note, actor, idempotencyKey);
  }

  /** POST /v1/users/:user_id/set-probation */
  @Post('v1/users/:user_id/set-probation')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('user:admin')
  async setProbationUser(
    @Param('user_id') userId: string,
    @Body() body: { reason?: string },
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    return this.workflowService.setProbationUser(Number(userId), body?.reason, actor, idempotencyKey);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // USER CREDENTIAL ENDPOINTS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * CREATE USER CREDENTIAL
   * POST /v1/users/:user_id/credentials
   */
  @Post('v1/users/:user_id/credentials')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('user:admin', 'user:manage')
  async createUserCredential(
    @Param('user_id') userId: string,
    @Body() request: UserCredentialCreateRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.createUserCredential(
      Number(userId),
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * VERIFY USER CREDENTIAL
   * POST /v1/users/:user_id/credentials/verify
   */
  @Post('v1/users/:user_id/credentials/verify')
  @HttpCode(HttpStatus.OK)
  async verifyUserCredential(
    @Param('user_id') userId: string,
    @Body() request: UserCredentialVerifyRequestDto,
    @CurrentActor() actor: Actor,
  ) {
    return this.workflowService.verifyUserCredential(
      Number(userId),
      request,
      actor,
    );
  }

  /**
   * LIST USER CREDENTIALS
   * GET /v1/users/:user_id/credentials
   */
  @Get('v1/users/:user_id/credentials')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('user:admin', 'user:read')
  async listUserCredentials(@Param('user_id') userId: string) {
    return this.workflowService.listUserCredentials(Number(userId));
  }

  // ──────────────────────────────────────────────────────────────────────────
  // USER ROLE ENDPOINTS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * ASSIGN ROLE TO USER
   * POST /v1/users/:user_id/roles
   */
  @Post('v1/users/:user_id/roles')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('user:admin')
  async assignRoleToUser(
    @Param('user_id') userId: string,
    @Body() request: UserRoleAssignRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.assignRoleToUser(
      Number(userId),
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * REVOKE ROLE FROM USER
   * DELETE /v1/users/:user_id/roles/:role_id
   */
  @Delete('v1/users/:user_id/roles/:role_id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('user:admin')
  async revokeRoleFromUser(
    @Param('user_id') userId: string,
    @Param('role_id') roleId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.revokeRoleFromUser(
      Number(userId),
      Number(roleId),
      actor,
      idempotencyKey,
    );
  }

  /**
   * LIST USER ROLES
   * GET /v1/users/:user_id/roles
   */
  @Get('v1/users/:user_id/roles')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('user:read')
  async listUserRoles(@Param('user_id') userId: string) {
    return this.workflowService.listUserRoles(Number(userId));
  }

  // ──────────────────────────────────────────────────────────────────────────
  // USER PERMISSION ENDPOINTS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * GRANT PERMISSION TO USER
   * POST /v1/users/:user_id/permissions
   */
  @Post('v1/users/:user_id/permissions')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('user:admin')
  async grantPermissionToUser(
    @Param('user_id') userId: string,
    @Body() request: UserPermissionGrantRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.grantPermissionToUser(
      Number(userId),
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * REVOKE PERMISSION FROM USER
   * DELETE /v1/users/:user_id/permissions/:permission_id
   */
  @Delete('v1/users/:user_id/permissions/:permission_id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('user:admin')
  async revokePermissionFromUser(
    @Param('user_id') userId: string,
    @Param('permission_id') permissionId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.revokePermissionFromUser(
      Number(userId),
      Number(permissionId),
      actor,
      idempotencyKey,
    );
  }

  /**
   * LIST USER PERMISSIONS
   * GET /v1/users/:user_id/permissions
   */
  @Get('v1/users/:user_id/permissions')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('user:read')
  async listUserPermissions(@Param('user_id') userId: string) {
    return this.workflowService.listUserPermissions(Number(userId));
  }
}
