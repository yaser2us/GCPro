import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

/**
 * LoginDto
 * Source: specs/identity/identity.pillar.v2.yml — Login command
 */
export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  channel_type: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  channel_value: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  otp_plain: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  platform: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  device_token: string;
}
