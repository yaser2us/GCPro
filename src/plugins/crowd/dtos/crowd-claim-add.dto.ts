import { IsNumber, IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * CrowdClaimAddDto
 * DTO for adding a claim to a crowd period
 * Based on specs/crowd/crowd.pillar.v2.yml
 */
export class CrowdClaimAddDto {
  @IsNumber()
  claimId: number;

  @IsString()
  approvedAmountSnapshot: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  eligibilityVersion?: string;

  @IsOptional()
  meta?: any;
}
