import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, ValidateNested, MaxLength } from 'class-validator';
import { ClaimDocumentDto } from './claim-document.dto';

/**
 * ClaimSubmit DTO
 * Source: specs/claim/claim.pillar.v2.yml lines 1609-1649
 *
 * HTTP: POST /api/v1/claim/submit
 * Idempotency: Via Idempotency-Key header
 */
export class ClaimSubmitDto {
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsString()
  @IsNotEmpty()
  claimantPersonId: string;

  @IsString()
  @IsNotEmpty()
  insurantPersonId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  claimType: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  hospitalName: string;

  @IsNotEmpty()
  @Type(() => Date)
  admissionDate: Date;

  @IsOptional()
  @Type(() => Date)
  dischargeDate?: Date;

  @IsString()
  @IsNotEmpty()
  diagnosis: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  treatmentType: string;

  @IsNumber()
  @IsNotEmpty()
  requestedAmount: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClaimDocumentDto)
  documents?: ClaimDocumentDto[];
}
