import { IsInt, IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * ReferralCode.Create Request DTO
 * Source: specs/referral/referral.pillar.yml lines 865-868
 *
 * HTTP: POST /v1/referral/codes
 * Idempotency: Via Idempotency-Key header
 */
export class ReferralCodeCreateRequestDto {
  @IsInt()
  program_id: number;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  code?: string;
}
