import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { Actor } from '../types/actor.type';

/**
 * Permissions Guard - checks if actor has required permissions
 *
 * Works with @RequirePermissions decorator
 * User must have ANY of the listed permissions
 *
 * In production, this would query a database for user permissions
 * For demo, we'll use a simple role-based check
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
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

    // Simple permission check: map roles to permissions
    const userPermissions = this.getRolePermissions(actor.actor_role);

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
   * Map role to permissions
   * In production, this would be a database lookup
   */
  private getRolePermissions(role: string): string[] {
    const rolePermissionMap: Record<string, string[]> = {
      ADMIN: [
        'missions:admin',
        'missions:manage',
        'missions:review',
        'missions:enroll',
        'missions:participant',
      ],
      REVIEWER: ['missions:review', 'missions:enroll', 'missions:participant'],
      USER: ['missions:enroll', 'missions:participant'],
      SYSTEM: ['*'], // System has all permissions
    };

    return rolePermissionMap[role] || [];
  }
}
