import { IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * FileLink.Create Request DTO
 * Source: specs/file/file.pillar.v2.yml
 *
 * HTTP: POST /v1/files/{file_id}/links
 * Idempotency: Via UNIQUE(file_id, target_type, target_id, role_code)
 */
export class FileLinkCreateRequestDto {
  @IsString()
  @MaxLength(32)
  target_type: string;

  @IsString()
  @MaxLength(128)
  target_id: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  role_code?: string;
}
