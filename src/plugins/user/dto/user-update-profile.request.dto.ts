import { IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * User.UpdateProfile Request DTO
 * Source: specs/user/user.pillar.v2.yml
 *
 * HTTP: PUT /v1/users/{user_id}/profile
 * Idempotency: Via Idempotency-Key header
 */
export class UserUpdateProfileRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone_number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;
}
