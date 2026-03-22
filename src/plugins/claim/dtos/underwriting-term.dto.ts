import { IsString, IsNotEmpty, IsOptional, IsNumber, MaxLength } from 'class-validator';

/**
 * UnderwritingTerm DTO
 * Source: specs/claim/claim.pillar.v2.yml lines 1795-1822
 *
 * Used for defining underwriting terms, exclusions, loadings
 */
export class UnderwritingTermDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  termType: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsNumber()
  valueFactor?: number;

  @IsOptional()
  @IsNumber()
  valueAmount?: number;

  @IsOptional()
  @IsNumber()
  valueDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  valueText?: string;
}
