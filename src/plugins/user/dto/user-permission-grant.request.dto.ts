import { IsString, IsOptional } from 'class-validator';

/**
 * UserPermission.Grant Request DTO
 * Source: specs/user/user.pillar.v2.yml
 *
 * HTTP: POST /v1/users/{user_id}/permissions
 * Idempotency: Via UNIQUE(user_id, permission_id)
 */
export class UserPermissionGrantRequestDto {
  @IsString()
  permission_id: string;

  @IsOptional()
  @IsString()
  effect?: string;
}
