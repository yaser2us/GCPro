import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * ClaimReject DTO
 * Source: specs/claim/claim.pillar.v2.yml lines 1682-1690
 *
 * HTTP: POST /api/v1/claim/:claimId/reject
 * Idempotency: Via Idempotency-Key header
 */
export class ClaimRejectDto {
  @IsString()
  @IsNotEmpty()
  rejectionReason: string;

  @IsOptional()
  @IsString()
  decisionNote?: string;
}
