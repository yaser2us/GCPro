import { IsString, IsOptional, MaxLength, IsDateString } from 'class-validator';

export class BenefitCatalogCreateDto {
  @IsString()
  @MaxLength(64)
  code: string;

  @IsString()
  @MaxLength(160)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  version?: string;

  @IsOptional()
  @IsDateString()
  effective_from?: string;

  @IsOptional()
  @IsDateString()
  effective_to?: string;

  @IsOptional()
  meta_json?: any;
}
