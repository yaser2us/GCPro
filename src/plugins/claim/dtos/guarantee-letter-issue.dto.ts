import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsNumber, MaxLength } from 'class-validator';

/**
 * GuaranteeLetterIssue DTO
 * Source: specs/claim/claim.pillar.v2.yml lines 1703-1726
 *
 * HTTP: POST /api/v1/guarantee-letter/issue
 * Idempotency: Via Idempotency-Key header
 */
export class GuaranteeLetterIssueDto {
  @IsString()
  @IsNotEmpty()
  medicalCaseId: string;

  @IsNumber()
  @IsNotEmpty()
  approvedLimitAmount: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string = 'MYR';

  @IsNotEmpty()
  @Type(() => Date)
  validFrom: Date;

  @IsNotEmpty()
  @Type(() => Date)
  validUntil: Date;

  @IsOptional()
  coverageSnapshot?: any;
}
