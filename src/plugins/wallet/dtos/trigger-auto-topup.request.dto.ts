import { IsNumber, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * TriggerAutoTopupRequestDto
 * Body for POST /api/v1/wallet/:walletId/auto-topup
 */
export class TriggerAutoTopupRequestDto {
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  wallet_id: number;
}
