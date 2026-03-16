import { IsString, IsNumber, IsOptional, MaxLength } from 'class-validator';

/**
 * MissionProgress.Record Request DTO
 * Source: specs/mission/missions.pillar.v2.yml lines 803-807
 *
 * HTTP: POST /v1/missions/assignments/{assignment_id}/progress
 * Idempotency: Via Idempotency-Key header
 */
export class MissionProgressRecordRequestDto {
  @IsString()
  @MaxLength(64)
  metric_code: string;

  @IsNumber()
  current_value: number;

  @IsOptional()
  @IsNumber()
  target_value?: number;

  @IsOptional()
  meta_json?: any;
}
