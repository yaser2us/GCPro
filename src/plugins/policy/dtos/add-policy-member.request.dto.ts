import { IsString, IsEnum, MaxLength } from 'class-validator';

/**
 * AddPolicyMember Request DTO
 * Source: specs/policy/policy.pillar.v2.yml lines 1400-1417
 *
 * HTTP: POST /api/v1/policy/:policyId/members/add
 */
export class AddPolicyMemberRequestDto {
  @IsString()
  policy_id: string;

  @IsString()
  person_id: string;

  @IsString()
  @IsEnum(['holder', 'dependent', 'beneficiary'])
  role: 'holder' | 'dependent' | 'beneficiary';

  @IsString()
  @MaxLength(128)
  idempotency_key: string;
}
