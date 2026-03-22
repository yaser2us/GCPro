import { IsString, IsOptional, MaxLength } from 'class-validator';

export class GuidelineDocumentCreateDto {
  @IsString()
  @MaxLength(64)
  code: string;

  @IsString()
  @MaxLength(160)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  scope_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  scope_ref_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  scope_ref_id?: string;

  @IsOptional()
  meta_json?: any;
}
