import { IsString } from 'class-validator';

/**
 * User.VerifyEmail Request DTO
 * Source: specs/user/user.pillar.v2.yml
 *
 * HTTP: POST /v1/users/{user_id}/verify-email
 * Idempotency: Via Idempotency-Key header
 */
export class UserVerifyEmailRequestDto {
  @IsString()
  verification_token: string;
}
