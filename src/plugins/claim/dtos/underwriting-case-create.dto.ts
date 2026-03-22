import {
  IsString,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  MaxLength,
} from 'class-validator';

/**
 * UnderwritingCaseCreateDto
 * DTO for creating medical underwriting case
 * Based on specs/claim/claim.pillar.v2.yml
 */
export class UnderwritingCaseCreateDto {
  @IsNumber()
  @IsNotEmpty()
  subjectRefId: number;

  @IsOptional()
  @IsNumber()
  contextRefId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  channel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  priority?: string = 'normal';

  @IsOptional()
  @IsNumber()
  assignedToUserId?: number;

  @IsOptional()
  metaJson?: any;
}
