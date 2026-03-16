import { IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * UserCredential.Create Request DTO
 * Source: specs/user/user.pillar.v2.yml
 *
 * HTTP: POST /v1/users/{user_id}/credentials
 * Idempotency: Via Idempotency-Key header
 */
export class UserCredentialCreateRequestDto {
  @IsString()
  @MaxLength(32)
  type: string;

  @IsOptional()
  @IsString()
  secret?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  provider_ref?: string;
}
