import { IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * MedicalProviderUpdate DTO
 * Source: specs/claim/claim.pillar.v2.yml lines 1885-1906
 *
 * HTTP: PUT /api/v1/admin/medical-provider/:providerId
 * Idempotency: Via Idempotency-Key header
 */
export class MedicalProviderUpdateDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  panelStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactEmail?: string;

  @IsOptional()
  metaJson?: any;
}
