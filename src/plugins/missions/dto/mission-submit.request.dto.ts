import { IsOptional, IsString } from 'class-validator';

/**
 * Mission.Submit Request DTO
 * Source: specs/mission/missions.pillar.v2.yml lines 809-812
 *
 * HTTP: POST /v1/missions/assignments/{assignment_id}/submissions
 * Idempotency: Via Idempotency-Key header
 */
export class MissionSubmitRequestDto {
  @IsOptional()
  @IsString()
  text_content?: string;

  @IsOptional()
  meta_json?: any;
}
