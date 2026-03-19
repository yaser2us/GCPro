import { IsString, IsEnum, MaxLength } from 'class-validator';

/**
 * UpdateParticipantStatus Request DTO
 * Source: specs/commission/commission.pillar.v2.yml lines 1282-1315
 *
 * HTTP: PUT /api/commission/participants/:id/status
 * Idempotency: Via Idempotency-Key header
 */
export class UpdateParticipantStatusRequestDto {
  @IsString()
  @MaxLength(16)
  @IsEnum(['active', 'inactive', 'suspended'])
  status: string;
}
