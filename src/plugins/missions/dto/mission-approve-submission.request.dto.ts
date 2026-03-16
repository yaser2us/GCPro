import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Mission Submission Review Request DTO (for Approve/Reject)
 * Based on missions.pillar.v1.yml lines 229-231
 *
 * HTTP: POST /v1/missions/submissions/{submission_id}/approve
 * HTTP: POST /v1/missions/submissions/{submission_id}/reject
 * Idempotency: Via Idempotency-Key header (not in body)
 */
export class MissionSubmissionReviewRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000) // Per spec line 231
  feedback?: string;
}

// Alias for backward compatibility
export class MissionApproveSubmissionRequestDto extends MissionSubmissionReviewRequestDto {}
