import { IsNumber, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * ClaimApprove DTO
 * Source: specs/claim/claim.pillar.v2.yml lines 1672-1680
 *
 * HTTP: POST /api/v1/claim/:claimId/approve
 * Idempotency: Via Idempotency-Key header
 */
export class ClaimApproveDto {
  @IsNumber()
  @IsNotEmpty()
  approvedAmount: number;

  @IsOptional()
  @IsString()
  decisionNote?: string;
}
