import { IsString, IsOptional, MaxLength, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * ReferralProgram.Create Request DTO
 * Source: specs/referral/referral.pillar.yml lines 852-859
 *
 * HTTP: POST /v1/referral/programs
 * Idempotency: Via Idempotency-Key header
 */
export class ReferralProgramCreateRequestDto {
  @IsString()
  @MaxLength(64)
  code: string;

  @IsString()
  @MaxLength(128)
  name: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  start_at?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  end_at?: Date;

  @IsOptional()
  eligibility_json?: any;

  @IsOptional()
  meta_json?: any;
}
