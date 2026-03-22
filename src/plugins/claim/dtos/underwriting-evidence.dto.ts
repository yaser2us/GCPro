import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

/**
 * UnderwritingEvidence DTO
 * Source: specs/claim/claim.pillar.v2.yml lines 1838-1856
 *
 * HTTP: POST /api/v1/underwriting/:caseId/add-evidence
 * Idempotency: Via Idempotency-Key header
 */
export class UnderwritingEvidenceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  evidenceType: string = 'survey';

  @IsString()
  @IsOptional()
  surveyResponseId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(512)
  note?: string;

  @IsOptional()
  metaJson?: any;
}
