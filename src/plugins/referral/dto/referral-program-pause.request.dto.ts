import { IsString, MaxLength } from 'class-validator';

/**
 * ReferralProgram.Pause Request DTO
 * Source: specs/referral/referral.pillar.yml lines 861-863
 *
 * HTTP: POST /v1/referral/programs/{id}/pause
 * Idempotency: Via Idempotency-Key header
 */
export class ReferralProgramPauseRequestDto {
  @IsString()
  @MaxLength(300)
  reason: string;
}
