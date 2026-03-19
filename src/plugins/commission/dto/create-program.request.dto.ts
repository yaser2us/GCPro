import { IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * CreateProgram Request DTO
 * Source: specs/commission/commission.pillar.v2.yml lines 819-846
 *
 * HTTP: POST /api/commission/programs
 * Idempotency: Via Idempotency-Key header
 */
export class CreateProgramRequestDto {
  @IsString()
  @MaxLength(64)
  code: string;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  settlement_cycle?: string;

  @IsOptional()
  meta_json?: any;
}
