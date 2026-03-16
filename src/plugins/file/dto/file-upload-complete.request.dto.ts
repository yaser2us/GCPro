import { IsString, IsNumber, IsOptional, MaxLength } from 'class-validator';

/**
 * FileUpload.Complete Request DTO
 * Source: specs/file/file.pillar.v2.yml
 *
 * HTTP: POST /v1/files/{file_id}/complete
 * Idempotency: Via Idempotency-Key header
 */
export class FileUploadCompleteRequestDto {
  @IsString()
  @MaxLength(512)
  storage_path: string;

  @IsString()
  @MaxLength(255)
  original_filename: string;

  @IsString()
  @MaxLength(120)
  content_type: string;

  @IsNumber()
  size_bytes: number;

  @IsString()
  @MaxLength(64)
  checksum_sha256: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  extension?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  storage_etag?: string;
}
