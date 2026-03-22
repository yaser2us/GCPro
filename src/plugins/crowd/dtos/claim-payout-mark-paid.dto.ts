import { IsOptional, IsString, MaxLength, IsNumber } from 'class-validator';

/**
 * ClaimPayoutMarkPaidDto
 * DTO for marking a claim payout as paid
 * Based on specs/crowd/crowd.pillar.v2.yml
 */
export class ClaimPayoutMarkPaidDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  payoutRef?: string;

  @IsOptional()
  @IsNumber()
  ledgerTxnId?: number;
}
