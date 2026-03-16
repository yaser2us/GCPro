import { IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * FileScan.Record Request DTO
 * Source: specs/file/file.pillar.v2.yml
 *
 * HTTP: POST /v1/files/{file_id}/scan-results
 * Idempotency: Via Idempotency-Key header
 */
export class FileScanRecordRequestDto {
  @IsString()
  @MaxLength(16)
  scan_type: string;

  @IsString()
  @MaxLength(16)
  status: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  provider?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  summary?: string;
}
