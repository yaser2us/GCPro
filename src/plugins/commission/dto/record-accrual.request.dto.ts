import { IsInt, IsString, IsOptional, IsNumber, IsDate, IsEnum, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * RecordAccrual Request DTO
 * Source: specs/commission/commission.pillar.v2.yml lines 935-995
 *
 * HTTP: POST /api/commission/accruals
 * Idempotency: Via Idempotency-Key header
 */
export class RecordAccrualRequestDto {
  @IsInt()
  program_id: number;

  @IsInt()
  participant_id: number;

  @IsOptional()
  @IsInt()
  rule_id?: number;

  @IsString()
  @MaxLength(24)
  @IsEnum(['one_time', 'recurring'])
  accrual_type: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  currency?: string;

  @IsOptional()
  @IsNumber()
  base_amount?: number;

  @IsOptional()
  @IsNumber()
  rate_pct?: number;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  source_ref_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  source_ref_id?: string;

  @IsString()
  @MaxLength(128)
  idempotency_key: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  occurred_at?: Date;

  @IsOptional()
  meta_json?: any;
}
