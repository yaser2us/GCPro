import { IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * FileUpload.Create Request DTO
 * Source: specs/file/file.pillar.v2.yml
 *
 * HTTP: POST /v1/files
 * Idempotency: Via UNIQUE(file_key)
 */
export class FileUploadCreateRequestDto {
  @IsString()
  @MaxLength(64)
  file_key: string;

  @IsOptional()
  @IsString()
  owner_account_id?: string;

  @IsOptional()
  @IsString()
  owner_person_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  owner_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  purpose_code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  visibility?: string;
}
