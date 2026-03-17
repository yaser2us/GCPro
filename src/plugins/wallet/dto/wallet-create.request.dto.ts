import { IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * WalletCreateRequestDto
 * Request DTO for creating a wallet
 *
 * Based on: specs/wallet/wallet.pillar.v2.yml
 */
export class WalletCreateRequestDto {
  @IsString()
  account_id: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  wallet_type?: string = 'MAIN';

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string = 'COIN';
}
