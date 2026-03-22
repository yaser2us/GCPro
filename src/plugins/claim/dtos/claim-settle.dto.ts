import { IsNumber, IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * ClaimSettle DTO
 * Source: specs/claim/claim.pillar.v2.yml lines 1692-1701
 *
 * HTTP: POST /api/v1/claim/:claimId/settle
 * Idempotency: Via Idempotency-Key header
 */
export class ClaimSettleDto {
  @IsNumber()
  @IsNotEmpty()
  settlementAmount: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(7)
  periodKey: string;

  @IsNumber()
  @IsOptional()
  policy_id?: number;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  item_code?: string;
}
