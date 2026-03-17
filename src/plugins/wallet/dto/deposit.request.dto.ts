import { IsString, IsNumber, IsOptional, MaxLength } from 'class-validator';

/**
 * DepositRequestDto
 * Request DTO for depositing funds into wallet
 *
 * Based on: specs/wallet/wallet.pillar.v2.yml
 */
export class DepositRequestDto {
  @IsString()
  wallet_id: string;

  @IsNumber()
  amount: number;

  @IsString()
  @MaxLength(8)
  currency: string;

  @IsString()
  @MaxLength(32)
  type: string; // manual_deposit, mission_reward, etc.

  @IsOptional()
  @IsString()
  @MaxLength(64)
  ref_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  ref_id?: string;

  @IsOptional()
  meta_json?: object;
}
