import { IsInt, IsString, IsOptional, IsNumber, IsDate, IsEnum, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * CreateRule Request DTO
 * Source: specs/commission/commission.pillar.v2.yml lines 883-933
 *
 * HTTP: POST /api/commission/programs/:program_id/rules
 * Idempotency: Via Idempotency-Key header
 */
export class CreateRuleRequestDto {
  @IsInt()
  program_id: number;

  @IsString()
  @MaxLength(64)
  code: string;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @MaxLength(16)
  @IsEnum(['percent', 'fixed', 'tiered'])
  rule_type: string;

  @IsOptional()
  @IsNumber()
  rate_pct?: number;

  @IsOptional()
  @IsNumber()
  amount_fixed?: number;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  conditions_json?: any;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effective_from?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effective_to?: Date;

  @IsOptional()
  meta_json?: any;
}
