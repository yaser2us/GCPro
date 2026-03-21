import { IsString, IsNumber, IsEnum, MaxLength } from 'class-validator';

/**
 * CreateBillingPlan Request DTO
 * Source: specs/policy/policy.pillar.v2.yml lines 1492-1514
 *
 * HTTP: POST /api/v1/policy/:policyId/billing-plan/create
 */
export class CreateBillingPlanRequestDto {
  @IsString()
  policy_id: string;

  @IsString()
  @IsEnum(['annual', 'monthly', 'quarterly'])
  @MaxLength(20)
  billing_type: 'annual' | 'monthly' | 'quarterly';

  @IsNumber()
  total_amount: number;

  @IsNumber()
  installment_count: number;

  @IsString()
  @MaxLength(128)
  idempotency_key: string;
}
