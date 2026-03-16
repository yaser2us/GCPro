import { IsString, IsOptional, MaxLength, IsObject } from 'class-validator';

/**
 * NotificationDelivery.Record Request DTO
 * Source: specs/notification/notification.pillar.v2.yml
 *
 * HTTP: POST /v1/notifications/{message_id}/attempts
 * Idempotency: Via Idempotency-Key header
 */
export class NotificationDeliveryRecordRequestDto {
  @IsString()
  @MaxLength(40)
  provider: string;

  @IsString()
  @MaxLength(20)
  status: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  provider_ref?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  error_code?: string;

  @IsOptional()
  @IsString()
  error_message?: string;

  @IsOptional()
  @IsObject()
  provider_payload?: any;
}
