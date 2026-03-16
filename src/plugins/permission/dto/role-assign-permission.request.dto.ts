import { IsString } from 'class-validator';

/**
 * Role.AssignPermission Request DTO
 * Source: specs/permission/permission.pillar.v2.yml
 *
 * HTTP: POST /v1/roles/{role_id}/permissions
 * Idempotency: Via Idempotency-Key header
 */
export class RoleAssignPermissionRequestDto {
  @IsString()
  permission_id: string;
}
