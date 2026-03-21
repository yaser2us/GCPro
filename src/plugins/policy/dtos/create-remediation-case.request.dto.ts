import { IsString, IsNumber, IsOptional, IsObject, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ActorDto } from './activate-policy.request.dto';

/**
 * CreateRemediationCase Request DTO
 * Source: specs/policy/policy.pillar.v2.yml lines 1534-1555
 *
 * HTTP: POST /api/v1/policy/:policyId/remediation/open
 */
export class CreateRemediationCaseRequestDto {
  @IsString()
  policy_id: string;

  @IsString()
  @MaxLength(60)
  reason_code: string;

  @IsOptional()
  @IsNumber()
  grace_days?: number;

  @IsOptional()
  @IsObject()
  required_actions?: any;

  @ValidateNested()
  @Type(() => ActorDto)
  actor: ActorDto;
}
