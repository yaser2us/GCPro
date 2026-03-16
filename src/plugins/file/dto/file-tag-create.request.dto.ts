import { IsString, MaxLength } from 'class-validator';

/**
 * FileTag.Create Request DTO
 * Source: specs/file/file.pillar.v2.yml
 *
 * HTTP: POST /v1/file-tags
 * Idempotency: Via UNIQUE(code)
 */
export class FileTagCreateRequestDto {
  @IsString()
  @MaxLength(64)
  code: string;

  @IsString()
  @MaxLength(128)
  name: string;
}
