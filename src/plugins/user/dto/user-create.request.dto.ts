import { IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * User.Create Request DTO
 * Source: specs/user/user.pillar.v2.yml
 *
 * HTTP: POST /v1/users
 * Idempotency: Via UNIQUE(phone_number) or UNIQUE(email)
 */
export class UserCreateRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone_number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;
}
