import { IsString, IsOptional, MaxLength, IsObject } from 'class-validator';

/**
 * NotificationMessage.Send Request DTO
 * Source: specs/notification/notification.pillar.v2.yml
 *
 * HTTP: POST /v1/notifications/send
 * Idempotency: Via UNIQUE(message_key)
 */
export class NotificationMessageSendRequestDto {
  @IsString()
  @MaxLength(120)
  message_key: string;

  @IsString()
  @MaxLength(80)
  template_code: string;

  @IsString()
  account_id: string;

  @IsOptional()
  @IsString()
  person_id?: string;

  @IsString()
  @MaxLength(20)
  channel: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  destination?: string;

  @IsOptional()
  @IsObject()
  payload_vars?: any;

  @IsOptional()
  @IsString()
  scheduled_for?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  trigger_event_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  trigger_event_type?: string;
}
