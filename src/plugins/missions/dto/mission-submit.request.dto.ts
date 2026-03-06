import { IsOptional, IsString, IsArray, IsInt, MaxLength } from 'class-validator';

/**
 * Mission.Submit Request DTO
 * Source: specs/mission/mission.pillar.yml lines 98-102 & command lines 271-347
 *
 * HTTP: POST /v1/missions/assignments/{assignment_id}/submit
 * Idempotency: Via Idempotency-Key header
 */
export class MissionSubmitRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  text_content?: string;

  @IsOptional()
  meta_json?: any; // JSON object for additional metadata

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  file_ref_ids?: number[]; // Array of file reference IDs
}
