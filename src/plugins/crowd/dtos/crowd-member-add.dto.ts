import { IsNumber, IsOptional, IsString, MaxLength, IsBoolean } from 'class-validator';

/**
 * CrowdMemberAddDto
 * DTO for adding a member to a crowd period
 * Based on specs/crowd/crowd.pillar.v2.yml
 */
export class CrowdMemberAddDto {
  @IsNumber()
  insurantId: number;

  @IsNumber()
  packageId: number;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  reasonCode?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  packageCodeSnapshot?: string;

  @IsOptional()
  @IsNumber()
  ageYearsSnapshot?: number;

  @IsOptional()
  @IsBoolean()
  smokerSnapshot?: boolean;

  @IsOptional()
  meta?: any;
}
