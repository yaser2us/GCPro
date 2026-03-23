import { IsString, IsNumber, IsEnum, IsOptional, MaxLength } from 'class-validator';

/**
 * CreateBillingPlan Request DTO
 * Source: specs/policy/policy.pillar.v2.yml lines 1492-1514
 *
 * HTTP: POST /api/v1/policy/:policyId/billing-plan/create
 *
 * C7: billing_type='split' → 2 installments at 50% each (1st due now, 2nd due +30d)
 *     billing_type='full'  → 1 installment for full amount due now
 */
export class CreateBillingPlanRequestDto {
  @IsString()
  policy_id: string;

  @IsString()
  @IsEnum(['annual', 'monthly', 'quarterly', 'split', 'full'])
  @MaxLength(20)
  billing_type: 'annual' | 'monthly' | 'quarterly' | 'split' | 'full';

  @IsNumber()
  total_amount: number;

  @IsNumber()
  @IsOptional()
  installment_count?: number;

  @IsString()
  @MaxLength(128)
  idempotency_key: string;
}
