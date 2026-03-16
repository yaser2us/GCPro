import { IsString } from 'class-validator';

/**
 * Mission.Assign Request DTO
 * Source: specs/mission/missions.pillar.v2.yml lines 798-800
 *
 * HTTP: POST /v1/missions/definitions/{mission_definition_id}/assignments
 * Idempotency: Via Idempotency-Key header
 */
export class MissionAssignRequestDto {
  @IsString()
  user_id: string;
}
