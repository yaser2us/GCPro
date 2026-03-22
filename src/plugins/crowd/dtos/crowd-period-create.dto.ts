import { IsString, IsOptional, MaxLength, IsDateString, IsNumber } from 'class-validator';

/**
 * CrowdPeriodCreateDto
 * DTO for creating a new crowd period
 * Based on specs/crowd/crowd.pillar.v2.yml
 */
export class CrowdPeriodCreateDto {
  @IsString()
  @MaxLength(20)
  periodKey: string;

  @IsOptional()
  @IsDateString()
  periodFrom?: string;

  @IsOptional()
  @IsDateString()
  periodTo?: string;

  @IsOptional()
  @IsString()
  lastDebtAmount?: string;

  @IsOptional()
  @IsString()
  lastExtraAmount?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  ruleVersion?: string;

  @IsOptional()
  meta?: any;
}
