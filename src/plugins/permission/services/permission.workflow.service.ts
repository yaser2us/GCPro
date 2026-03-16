import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { OutboxService } from '../../../corekit/services/outbox.service';
import { PermissionRepository } from '../repositories/permission.repo';
import { RoleRepository } from '../repositories/role.repo';
import { RolePermissionRepository } from '../repositories/role-permission.repo';
import { PermissionCreateRequestDto } from '../dto/permission-create.request.dto';
import { PermissionUpdateRequestDto } from '../dto/permission-update.request.dto';
import { RoleCreateRequestDto } from '../dto/role-create.request.dto';
import { RoleAssignPermissionRequestDto } from '../dto/role-assign-permission.request.dto';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * Permission Workflow Service
 * Implements permission & role commands following the workflow discipline:
 * Guard → Validate → Write → Emit → Commit
 *
 * Based on specs/permission/permission.pillar.v2.yml
 */
@Injectable()
export class PermissionWorkflowService {
  constructor(
    private readonly txService: TransactionService,
    private readonly outboxService: OutboxService,
    private readonly permissionRepo: PermissionRepository,
    private readonly roleRepo: RoleRepository,
    private readonly rolePermissionRepo: RolePermissionRepository,
  ) {}

  /**
   * PERMISSION.CREATE COMMAND
   * Source: specs/permission/permission.pillar.v2.yml
   *
   * HTTP: POST /v1/permissions
   * Idempotency: Via unique code constraint
   */
  async createPermission(
    request: PermissionCreateRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: code is required
      if (!request.code || request.code === '') {
        throw new BadRequestException({
          code: 'PERMISSION_CODE_REQUIRED',
          message: 'Permission code is required',
        });
      }

      // WRITE: upsert permission by code
      const permissionId = await this.permissionRepo.upsert(
        {
          code: request.code,
          name: request.name,
          description: request.description || null,
          scope: request.scope || 'api',
          status: 'active',
        },
        queryRunner,
      );

      // EMIT: PERMISSION_CREATED event
      await this.outboxService.enqueue(
        {
          event_name: 'PERMISSION_CREATED',
          event_version: 1,
          aggregate_type: 'PERMISSION',
          aggregate_id: String(permissionId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            permission_id: permissionId,
            code: request.code,
            name: request.name,
          },
        },
        queryRunner,
      );

      return {
        permission_id: permissionId,
        status: 'active',
      };
    });

    return result;
  }

  /**
   * PERMISSION.GET COMMAND
   * Source: specs/permission/permission.pillar.v2.yml
   *
   * HTTP: GET /v1/permissions/{permission_id}
   */
  async getPermission(id: number) {
    const permission = await this.permissionRepo.findById(id);

    if (!permission) {
      throw new NotFoundException({
        code: 'PERMISSION_NOT_FOUND',
        message: `Permission with id ${id} not found`,
      });
    }

    return permission;
  }

  /**
   * PERMISSION.LIST COMMAND
   * Source: specs/permission/permission.pillar.v2.yml
   *
   * HTTP: GET /v1/permissions
   */
  async listPermissions() {
    const permissions = await this.permissionRepo.findAll();
    return { items: permissions };
  }

  /**
   * PERMISSION.UPDATE COMMAND
   * Source: specs/permission/permission.pillar.v2.yml
   *
   * HTTP: PUT /v1/permissions/{permission_id}
   */
  async updatePermission(
    id: number,
    request: PermissionUpdateRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: permission
      const permission = await this.permissionRepo.findById(id, queryRunner);
      if (!permission) {
        throw new NotFoundException({
          code: 'PERMISSION_NOT_FOUND',
          message: `Permission with id ${id} not found`,
        });
      }

      // WRITE: update permission
      await this.permissionRepo.update(
        id,
        {
          name: request.name ?? permission.name,
          description: request.description ?? permission.description,
          scope: request.scope ?? permission.scope,
        },
        queryRunner,
      );

      // EMIT: PERMISSION_UPDATED event
      await this.outboxService.enqueue(
        {
          event_name: 'PERMISSION_UPDATED',
          event_version: 1,
          aggregate_type: 'PERMISSION',
          aggregate_id: String(id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            permission_id: id,
          },
        },
        queryRunner,
      );

      return {
        permission_id: id,
      };
    });

    return result;
  }

  /**
   * PERMISSION.DEACTIVATE COMMAND
   * Source: specs/permission/permission.pillar.v2.yml
   *
   * HTTP: POST /v1/permissions/{permission_id}/deactivate
   */
  async deactivatePermission(
    id: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: permission
      const permission = await this.permissionRepo.findById(id, queryRunner);
      if (!permission) {
        throw new NotFoundException({
          code: 'PERMISSION_NOT_FOUND',
          message: `Permission with id ${id} not found`,
        });
      }

      // GUARD: permission must be active
      if (permission.status !== 'active') {
        throw new ConflictException({
          code: 'PERMISSION_NOT_ACTIVE',
          message: `Permission is not active, current status: ${permission.status}`,
        });
      }

      // WRITE: update permission to inactive
      await this.permissionRepo.update(
        id,
        { status: 'inactive' },
        queryRunner,
      );

      // EMIT: PERMISSION_DEACTIVATED event
      await this.outboxService.enqueue(
        {
          event_name: 'PERMISSION_DEACTIVATED',
          event_version: 1,
          aggregate_type: 'PERMISSION',
          aggregate_id: String(id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            permission_id: id,
          },
        },
        queryRunner,
      );

      return {
        permission_id: id,
        status: 'inactive',
      };
    });

    return result;
  }

  /**
   * ROLE.CREATE COMMAND
   * Source: specs/permission/permission.pillar.v2.yml
   *
   * HTTP: POST /v1/roles
   */
  async createRole(
    request: RoleCreateRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: code is required
      if (!request.code || request.code === '') {
        throw new BadRequestException({
          code: 'ROLE_CODE_REQUIRED',
          message: 'Role code is required',
        });
      }

      // WRITE: upsert role by code
      const roleId = await this.roleRepo.upsert(
        {
          code: request.code,
          name: request.name,
        },
        queryRunner,
      );

      // EMIT: ROLE_CREATED event
      await this.outboxService.enqueue(
        {
          event_name: 'ROLE_CREATED',
          event_version: 1,
          aggregate_type: 'ROLE',
          aggregate_id: String(roleId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            role_id: roleId,
            code: request.code,
            name: request.name,
          },
        },
        queryRunner,
      );

      return {
        role_id: roleId,
      };
    });

    return result;
  }

  /**
   * ROLE.GET COMMAND
   * Source: specs/permission/permission.pillar.v2.yml
   *
   * HTTP: GET /v1/roles/{role_id}
   */
  async getRole(id: number) {
    const role = await this.roleRepo.findById(id);

    if (!role) {
      throw new NotFoundException({
        code: 'ROLE_NOT_FOUND',
        message: `Role with id ${id} not found`,
      });
    }

    return role;
  }

  /**
   * ROLE.LIST COMMAND
   * Source: specs/permission/permission.pillar.v2.yml
   *
   * HTTP: GET /v1/roles
   */
  async listRoles() {
    const roles = await this.roleRepo.findAll();
    return { items: roles };
  }

  /**
   * ROLE.ASSIGN_PERMISSION COMMAND
   * Source: specs/permission/permission.pillar.v2.yml
   *
   * HTTP: POST /v1/roles/{role_id}/permissions
   */
  async assignPermissionToRole(
    roleId: number,
    request: RoleAssignPermissionRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: role exists
      const role = await this.roleRepo.findById(roleId, queryRunner);
      if (!role) {
        throw new NotFoundException({
          code: 'ROLE_NOT_FOUND',
          message: `Role with id ${roleId} not found`,
        });
      }

      // GUARD: permission exists
      const permission = await this.permissionRepo.findById(
        Number(request.permission_id),
        queryRunner,
      );
      if (!permission) {
        throw new NotFoundException({
          code: 'PERMISSION_NOT_FOUND',
          message: `Permission with id ${request.permission_id} not found`,
        });
      }

      // WRITE: upsert role-permission assignment
      const rolePermissionId = await this.rolePermissionRepo.upsert(
        {
          role_id: roleId,
          permission_id: Number(request.permission_id),
        },
        queryRunner,
      );

      // EMIT: ROLE_PERMISSION_ASSIGNED event
      await this.outboxService.enqueue(
        {
          event_name: 'ROLE_PERMISSION_ASSIGNED',
          event_version: 1,
          aggregate_type: 'ROLE',
          aggregate_id: String(roleId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            role_id: roleId,
            permission_id: request.permission_id,
            role_permission_id: rolePermissionId,
          },
        },
        queryRunner,
      );

      return {
        role_permission_id: rolePermissionId,
      };
    });

    return result;
  }

  /**
   * ROLE.REVOKE_PERMISSION COMMAND
   * Source: specs/permission/permission.pillar.v2.yml
   *
   * HTTP: DELETE /v1/roles/{role_id}/permissions/{permission_id}
   */
  async revokePermissionFromRole(
    roleId: number,
    permissionId: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: role exists
      const role = await this.roleRepo.findById(roleId, queryRunner);
      if (!role) {
        throw new NotFoundException({
          code: 'ROLE_NOT_FOUND',
          message: `Role with id ${roleId} not found`,
        });
      }

      // GUARD: assignment exists
      const assignment = await this.rolePermissionRepo.findByRoleAndPermission(
        roleId,
        permissionId,
        queryRunner,
      );
      if (!assignment) {
        throw new NotFoundException({
          code: 'ROLE_PERMISSION_NOT_FOUND',
          message: `Role permission assignment not found`,
        });
      }

      // WRITE: delete assignment
      await this.rolePermissionRepo.delete(
        roleId,
        permissionId,
        queryRunner,
      );

      // EMIT: ROLE_PERMISSION_REVOKED event
      await this.outboxService.enqueue(
        {
          event_name: 'ROLE_PERMISSION_REVOKED',
          event_version: 1,
          aggregate_type: 'ROLE',
          aggregate_id: String(roleId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            role_id: roleId,
            permission_id: permissionId,
          },
        },
        queryRunner,
      );

      return {
        role_id: roleId,
        permission_id: permissionId,
      };
    });

    return result;
  }

  /**
   * ROLE.LIST_PERMISSIONS COMMAND
   * Source: specs/permission/permission.pillar.v2.yml
   *
   * HTTP: GET /v1/roles/{role_id}/permissions
   */
  async listRolePermissions(roleId: number) {
    // GUARD: role exists
    const role = await this.roleRepo.findById(roleId);
    if (!role) {
      throw new NotFoundException({
        code: 'ROLE_NOT_FOUND',
        message: `Role with id ${roleId} not found`,
      });
    }

    // READ: get permissions via JOIN
    const permissions = await this.rolePermissionRepo.getPermissionsForRole(roleId);

    return { items: permissions };
  }
}
