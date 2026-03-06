import { IsInt, IsOptional, IsString, Min } from 'class-validator';

/**
 * Mission.Assign Request DTO
 * Source: specs/mission/mission.pillar.yml lines 93-96 & command lines 210-269
 *
 * HTTP: POST /v1/missions/definitions/{definition_id}/assign
 * Idempotency: Via Idempotency-Key header
 */
export class MissionAssignRequestDto {
  @IsInt()
  @Min(1)
  user_id: number; // bigint in database, but number in TypeScript (safe for values < 2^53)

  @IsOptional()
  @IsString()
  assignment_type?: string; // e.g., "self_enroll", "admin_assigned"
}
