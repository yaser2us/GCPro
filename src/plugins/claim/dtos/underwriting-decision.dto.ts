import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, ValidateNested, MaxLength } from 'class-validator';
import { UnderwritingTermDto } from './underwriting-term.dto';

/**
 * UnderwritingDecision DTO
 * Source: specs/claim/claim.pillar.v2.yml lines 1770-1793
 *
 * HTTP: POST /api/v1/underwriting/:caseId/record-decision
 * Idempotency: Via Idempotency-Key header
 */
export class UnderwritingDecisionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  decision: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  riskLevel?: string;

  @IsOptional()
  @IsNumber()
  overallLoadingFactor?: number;

  @IsOptional()
  decisionReasonJson?: any;

  @IsOptional()
  @IsString()
  decisionNotes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UnderwritingTermDto)
  terms?: UnderwritingTermDto[];
}
