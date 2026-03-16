import { IsString } from 'class-validator';

/**
 * UserRole.Assign Request DTO
 * Source: specs/user/user.pillar.v2.yml
 *
 * HTTP: POST /v1/users/{user_id}/roles
 * Idempotency: Via PRIMARY KEY(user_id, role_id)
 */
export class UserRoleAssignRequestDto {
  @IsString()
  role_id: string;
}
