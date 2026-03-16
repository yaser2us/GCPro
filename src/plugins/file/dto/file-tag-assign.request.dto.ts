import { IsString } from 'class-validator';

/**
 * FileTag.Assign Request DTO
 * Source: specs/file/file.pillar.v2.yml
 *
 * HTTP: POST /v1/files/{file_id}/tags
 * Idempotency: Via UNIQUE(file_id, tag_id)
 */
export class FileTagAssignRequestDto {
  @IsString()
  tag_id: string;
}
