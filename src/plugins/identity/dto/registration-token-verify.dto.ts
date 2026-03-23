import { IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * RegistrationTokenVerifyDto
 * Source: specs/identity/identity.pillar.v2.yml — VerifyRegistrationToken command
 */
export class RegistrationTokenVerifyDto {
  @IsString()
  @IsOptional()
  @MaxLength(128)
  token?: string;

  @IsString()
  @IsOptional()
  @MaxLength(16)
  otp_plain?: string;
}
