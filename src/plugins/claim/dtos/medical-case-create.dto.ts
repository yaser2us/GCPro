import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

/**
 * MedicalCaseCreate DTO
 * Source: specs/claim/claim.pillar.v2.yml lines 1727-1758
 *
 * HTTP: POST /api/v1/medical-case/create
 * Idempotency: Via Idempotency-Key header
 */
export class MedicalCaseCreateDto {
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsString()
  @IsNotEmpty()
  personId: string;

  @IsString()
  @IsNotEmpty()
  policyId: string;

  @IsString()
  @IsNotEmpty()
  providerId: string;

  @IsString()
  @IsOptional()
  @MaxLength(16)
  admissionType?: string = 'emergency';

  @IsString()
  @IsOptional()
  @MaxLength(64)
  diagnosisCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  diagnosisText?: string;

  @IsOptional()
  @Type(() => Date)
  admittedAt?: Date;
}
