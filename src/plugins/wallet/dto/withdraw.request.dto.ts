import { IsString, IsNumber, IsOptional, MaxLength } from 'class-validator';

/**
 * WithdrawRequestDto
 * Request DTO for withdrawing funds from wallet
 *
 * Based on: specs/wallet/wallet.pillar.v2.yml
 */
export class WithdrawRequestDto {
  @IsString()
  wallet_id: string;

  @IsNumber()
  amount: number;

  @IsString()
  @MaxLength(8)
  currency: string;

  @IsString()
  @MaxLength(32)
  type: string;

  @IsOptional()
  meta_json?: object;
}
