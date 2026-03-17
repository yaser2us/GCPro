import { IsInt, IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * ReferralInvite.Create Request DTO
 * Source: specs/referral/referral.pillar.yml lines 870-875
 *
 * HTTP: POST /v1/referral/invites
 * Idempotency: Via Idempotency-Key header
 */
export class ReferralInviteCreateRequestDto {
  @IsInt()
  program_id: number;

  @IsInt()
  referral_code_id: number;

  @IsString()
  @MaxLength(16)
  channel_type: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  channel_value?: string;
}
