import { IsNumber, IsString, IsNotEmpty, MaxLength, IsOptional, IsObject } from 'class-validator';

/**
 * VerificationStatusUpsertDto
 * Source: specs/identity/identity.pillar.v2.yml — UpsertVerificationStatus command
 */
export class VerificationStatusUpsertDto {
  @IsNumber()
  account_id: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  type: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  status: string;

  @IsObject()
  @IsOptional()
  meta_json?: Record<string, any>;
}
