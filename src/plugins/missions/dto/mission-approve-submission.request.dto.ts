import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Mission.ApproveSubmission Request DTO
 * Source: specs/mission/mission.pillar.yml lines 104-106 & command lines 349-456
 *
 * HTTP: POST /v1/missions/submissions/{submission_id}/approve
 * Idempotency: Via Idempotency-Key header (not in body)
 */
export class MissionApproveSubmissionRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedback?: string;
}
