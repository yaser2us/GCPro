import { IsString, IsOptional, MaxLength, IsDateString } from 'class-validator';

export class GuidelineVersionCreateDto {
  @IsString()
  @MaxLength(32)
  version_code: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  content_type?: string;

  @IsOptional()
  @IsString()
  content_text?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  content_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  file_ref_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  file_ref_id?: string;

  @IsOptional()
  @IsDateString()
  effective_from?: string;

  @IsOptional()
  @IsDateString()
  effective_to?: string;

  @IsOptional()
  meta_json?: any;
}
