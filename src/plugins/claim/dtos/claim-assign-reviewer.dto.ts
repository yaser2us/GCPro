import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

/**
 * ClaimAssignReviewer DTO
 * Source: specs/claim/claim.pillar.v2.yml lines 1661-1670
 *
 * HTTP: POST /api/v1/claim/:claimId/assign-reviewer
 * Idempotency: Via Idempotency-Key header
 */
export class ClaimAssignReviewerDto {
  @IsString()
  @IsNotEmpty()
  reviewerId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  reviewerRole: string;
}
