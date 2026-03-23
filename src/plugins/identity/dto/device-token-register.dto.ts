import { IsNumber, IsString, IsNotEmpty, MaxLength } from 'class-validator';

/**
 * DeviceTokenRegisterDto
 * Source: specs/identity/identity.pillar.v2.yml — RegisterDevice command
 */
export class DeviceTokenRegisterDto {
  @IsNumber()
  user_id: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  platform: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  token: string;
}
