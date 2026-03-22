import { IsString, IsOptional, IsNumber, MaxLength } from 'class-validator';

export class BenefitCatalogItemCreateDto {
  @IsString()
  @MaxLength(64)
  item_code: string;

  @IsString()
  @MaxLength(160)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  limit_type?: string;

  @IsOptional()
  @IsString()
  limit_amount?: string;

  @IsOptional()
  @IsNumber()
  limit_count?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  eligibility_rule_version?: string;

  @IsOptional()
  eligibility_rule_json?: any;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  calculation_mode?: string;

  @IsOptional()
  @IsString()
  percent_value?: string;

  @IsOptional()
  @IsString()
  fixed_amount?: string;
}
