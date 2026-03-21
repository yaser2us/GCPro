import { IsString, IsNumber } from 'class-validator';

/**
 * EvaluateDepositRequirement Request DTO
 * Source: specs/policy/policy.pillar.v2.yml lines 1556-1565
 *
 * HTTP: POST /api/v1/policy/:policyId/deposit/evaluate
 */
export class EvaluateDepositRequirementRequestDto {
  @IsString()
  policy_id: string;

  @IsNumber()
  current_balance: number;
}
