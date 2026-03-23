import { IsString, IsOptional, IsNotEmpty, MaxLength, IsObject } from 'class-validator';

/**
 * RegistrationTokenIssueDto
 * Source: specs/identity/identity.pillar.v2.yml — IssueRegistrationToken command
 */
export class RegistrationTokenIssueDto {
  @IsString()
  @IsOptional()
  @MaxLength(32)
  purpose?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  channel_type: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  channel_value: string;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  invite_code?: string;

  @IsString()
  @IsOptional()
  @MaxLength(128)
  token?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  otp_hash?: string;

  @IsString()
  @IsNotEmpty()
  expires_at: string;

  @IsObject()
  @IsOptional()
  meta_json?: Record<string, any>;
}
