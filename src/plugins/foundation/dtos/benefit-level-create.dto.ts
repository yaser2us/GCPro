import { IsString, IsOptional, IsNumber, MaxLength } from 'class-validator';

export class BenefitLevelCreateDto {
  @IsString()
  @MaxLength(32)
  level_code: string;

  @IsString()
  @MaxLength(128)
  level_name: string;

  @IsOptional()
  @IsNumber()
  sort_order?: number;

  @IsOptional()
  meta_json?: any;
}
