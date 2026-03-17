import { IsString, MaxLength } from 'class-validator';

/**
 * AccountCreateRequestDto
 * Request DTO for creating an account
 *
 * Based on: specs/wallet/wallet.pillar.v2.yml
 */
export class AccountCreateRequestDto {
  @IsString()
  @MaxLength(16)
  type: string; // user, merchant, system
}
