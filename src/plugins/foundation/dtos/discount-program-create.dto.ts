import { IsString, IsOptional, MaxLength, IsDateString } from 'class-validator';

export class DiscountProgramCreateDto {
  @IsString()
  @MaxLength(64)
  code: string;

  @IsString()
  @MaxLength(20)
  discount_type: string;

  @IsString()
  value: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  eligibility_rule_version?: string;

  @IsOptional()
  rule_json?: any;

  @IsOptional()
  @IsDateString()
  starts_at?: string;

  @IsOptional()
  @IsDateString()
  ends_at?: string;
}
