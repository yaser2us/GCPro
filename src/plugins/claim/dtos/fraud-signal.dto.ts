import { IsString, IsNotEmpty, IsNumber, IsOptional, MaxLength } from 'class-validator';

/**
 * FraudSignal DTO
 * Source: specs/claim/claim.pillar.v2.yml lines 1824-1836
 *
 * HTTP: POST /api/v1/claim/:claimId/fraud-signal/record
 * Idempotency: Via Idempotency-Key header
 */
export class FraudSignalDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  signalType: string;

  @IsNumber()
  @IsNotEmpty()
  signalScore: number;

  @IsOptional()
  signalPayload?: any;
}
