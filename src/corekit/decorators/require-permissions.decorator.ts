import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to specify required permissions for an endpoint
 *
 * Usage:
 * @RequirePermissions('missions:admin', 'missions:review')
 *
 * User must have ANY of the listed permissions
 */
export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
