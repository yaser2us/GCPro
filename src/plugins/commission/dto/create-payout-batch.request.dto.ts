import { IsInt, IsString, IsOptional, IsDate, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * CreatePayoutBatch Request DTO
 * Source: specs/commission/commission.pillar.v2.yml lines 997-1025
 *
 * HTTP: POST /api/commission/programs/:program_id/payout-batches
 * Idempotency: Via Idempotency-Key header
 */
export class CreatePayoutBatchRequestDto {
  @IsInt()
  program_id: number;

  @IsString()
  @MaxLength(64)
  batch_code: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  currency?: string;

  @Type(() => Date)
  @IsDate()
  period_start: Date;

  @Type(() => Date)
  @IsDate()
  period_end: Date;

  @IsOptional()
  meta_json?: any;
}
