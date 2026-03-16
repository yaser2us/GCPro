import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { Actor } from '../types/actor.type';

/**
 * Permissions Guard - checks if actor has required permissions
 *
 * Works with @RequirePermissions decorator
 * User must have ANY of the listed permissions
 *
 * Queries database for actual user permissions via role assignments
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectDataSource() private dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      // No permissions required
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const actor: Actor = request.actor;

    if (!actor) {
      throw new ForbiddenException('No actor found in request');
    }

    // Query database for user permissions
    const userPermissions = await this.getUserPermissions(actor.actor_user_id);

    // Check if user has ANY of the required permissions
    const hasPermission = requiredPermissions.some((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `User lacks required permissions. Needs one of: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }

  /**
   * Get user permissions from database via role assignments
   */
  private async getUserPermissions(userId: string): Promise<string[]> {
    const query = `
      SELECT DISTINCT p.code
      FROM permission p
      INNER JOIN role_permission rp ON p.id = rp.permission_id
      INNER JOIN user_role ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = ?
        AND p.status = 'active'
    `;

    const results = await this.dataSource.query(query, [userId]);
    return results.map((row: any) => row.code);
  }
}
