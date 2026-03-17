import { IsInt, IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * ReferralConversion.Create Request DTO
 * Source: specs/referral/referral.pillar.yml lines 881-887
 *
 * HTTP: POST /v1/referral/conversions
 * Idempotency: Via Idempotency-Key header
 */
export class ReferralConversionCreateRequestDto {
  @IsString()
  @MaxLength(128)
  invite_token: string;

  @IsInt()
  referred_user_id: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  conversion_ref_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  conversion_ref_id?: string;

  @IsOptional()
  meta_json?: any;
}
