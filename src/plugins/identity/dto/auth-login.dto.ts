import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

/**
 * AuthLoginDto — C1 password-based login
 * POST /v1/auth/login
 */
export class AuthLoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  phone_number: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  password: string;
}
