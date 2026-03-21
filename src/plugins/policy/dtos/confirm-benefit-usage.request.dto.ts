import { IsString, IsNumber, IsOptional, MaxLength } from 'class-validator';

/**
 * ConfirmBenefitUsage Request DTO
 * Source: specs/policy/policy.pillar.v2.yml lines 1456-1491
 *
 * HTTP: POST /api/v1/policy/benefit-usage/confirm
 */
export class ConfirmBenefitUsageRequestDto {
  @IsString()
  policy_id: string;

  @IsString()
  @MaxLength(32)
  period_key: string;

  @IsString()
  @MaxLength(64)
  item_code: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsNumber()
  count?: number;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  ref_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  ref_id?: string;

  @IsString()
  @MaxLength(128)
  idempotency_key: string;
}
