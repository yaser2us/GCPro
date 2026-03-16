import { IsString, MaxLength } from 'class-validator';

/**
 * UserCredential.Verify Request DTO
 * Source: specs/user/user.pillar.v2.yml
 *
 * HTTP: POST /v1/users/{user_id}/credentials/verify
 */
export class UserCredentialVerifyRequestDto {
  @IsString()
  @MaxLength(32)
  type: string;

  @IsString()
  secret: string;
}
