import { IsInt, IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * EnrollParticipant Request DTO
 * Source: specs/commission/commission.pillar.v2.yml lines 848-881
 *
 * HTTP: POST /api/commission/programs/:program_id/participants
 * Idempotency: Via Idempotency-Key header
 */
export class EnrollParticipantRequestDto {
  @IsInt()
  program_id: number;

  @IsString()
  @MaxLength(16)
  participant_type: string;

  @IsInt()
  participant_id: number;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  default_payout_method?: string;

  @IsOptional()
  @IsInt()
  wallet_id?: number;

  @IsOptional()
  @IsInt()
  bank_profile_id?: number;

  @IsOptional()
  meta_json?: any;
}
