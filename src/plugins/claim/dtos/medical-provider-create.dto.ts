import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

/**
 * MedicalProviderCreate DTO
 * Source: specs/claim/claim.pillar.v2.yml lines 1857-1883
 *
 * HTTP: POST /api/v1/admin/medical-provider
 * Idempotency: Via Idempotency-Key header
 */
export class MedicalProviderCreateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  providerCode: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  type: string = 'hospital';

  @IsOptional()
  @IsString()
  @MaxLength(16)
  panelStatus?: string = 'active';

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
