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
import { PermissionWorkflowService } from '../services/permission.workflow.service';
import { PermissionCreateRequestDto } from '../dto/permission-create.request.dto';
import { PermissionUpdateRequestDto } from '../dto/permission-update.request.dto';
import { RoleCreateRequestDto } from '../dto/role-create.request.dto';
import { RoleAssignPermissionRequestDto } from '../dto/role-assign-permission.request.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * Permission Controller
 * Handles HTTP endpoints for permission and role operations
 *
 * Based on specs/permission/permission.pillar.v2.yml commands section
 */
@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class PermissionController {
  constructor(private readonly workflowService: PermissionWorkflowService) {}

  // ──────────────────────────────────────────────────────────────────────────
  // PERMISSION ENDPOINTS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * CREATE PERMISSION
   * POST /v1/permissions
   */
  @Post('v1/permissions')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('permission:admin')
  async createPermission(
    @Body() request: PermissionCreateRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    console.log('🔍 CREATE PERMISSION called');
    console.log('   Request body:', request);
    console.log('   Actor:', actor);

    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.createPermission(
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * GET PERMISSION
   * GET /v1/permissions/:permission_id
   */
  @Get('v1/permissions/:permission_id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('permission:read')
  async getPermission(@Param('permission_id') permissionId: string) {
    return this.workflowService.getPermission(Number(permissionId));
  }

  /**
   * LIST PERMISSIONS
   * GET /v1/permissions
   */
  @Get('v1/permissions')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('permission:read')
  async listPermissions() {
    return this.workflowService.listPermissions();
  }

  /**
   * UPDATE PERMISSION
   * PUT /v1/permissions/:permission_id
   */
  @Put('v1/permissions/:permission_id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('permission:admin')
  async updatePermission(
    @Param('permission_id') permissionId: string,
    @Body() request: PermissionUpdateRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.updatePermission(
      Number(permissionId),
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * DEACTIVATE PERMISSION
   * POST /v1/permissions/:permission_id/deactivate
   */
  @Post('v1/permissions/:permission_id/deactivate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('permission:admin')
  async deactivatePermission(
    @Param('permission_id') permissionId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.deactivatePermission(
      Number(permissionId),
      actor,
      idempotencyKey,
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ROLE ENDPOINTS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * CREATE ROLE
   * POST /v1/roles
   */
  @Post('v1/roles')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('permission:admin')
  async createRole(
    @Body() request: RoleCreateRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.createRole(request, actor, idempotencyKey);
  }

  /**
   * GET ROLE
   * GET /v1/roles/:role_id
   */
  @Get('v1/roles/:role_id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('permission:read')
  async getRole(@Param('role_id') roleId: string) {
    return this.workflowService.getRole(Number(roleId));
  }

  /**
   * LIST ROLES
   * GET /v1/roles
   */
  @Get('v1/roles')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('permission:read')
  async listRoles() {
    return this.workflowService.listRoles();
  }

  /**
   * ASSIGN PERMISSION TO ROLE
   * POST /v1/roles/:role_id/permissions
   */
  @Post('v1/roles/:role_id/permissions')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('permission:admin')
  async assignPermissionToRole(
    @Param('role_id') roleId: string,
    @Body() request: RoleAssignPermissionRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    console.log('🔍 ASSIGN PERMISSION TO ROLE called');
    console.log('   role_id param:', roleId, 'Number:', Number(roleId));
    console.log('   Request body:', request);

    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.assignPermissionToRole(
      Number(roleId),
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * REVOKE PERMISSION FROM ROLE
   * DELETE /v1/roles/:role_id/permissions/:permission_id
   */
  @Delete('v1/roles/:role_id/permissions/:permission_id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('permission:admin')
  async revokePermissionFromRole(
    @Param('role_id') roleId: string,
    @Param('permission_id') permissionId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.revokePermissionFromRole(
      Number(roleId),
      Number(permissionId),
      actor,
      idempotencyKey,
    );
  }

  /**
   * LIST ROLE PERMISSIONS
   * GET /v1/roles/:role_id/permissions
   */
  @Get('v1/roles/:role_id/permissions')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('permission:read')
  async listRolePermissions(@Param('role_id') roleId: string) {
    return this.workflowService.listRolePermissions(Number(roleId));
  }
}
