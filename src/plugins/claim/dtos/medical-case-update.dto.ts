import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

/**
 * MedicalCaseUpdate DTO
 * Source: specs/claim/claim.pillar.v2.yml lines 1759-1768
 *
 * HTTP: POST /api/v1/medical-case/:medicalCaseId/update
 * Idempotency: Via Idempotency-Key header
 */
export class MedicalCaseUpdateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  status: string;

  @IsOptional()
  @Type(() => Date)
  dischargedAt?: Date;
}
