import { IsString, IsOptional, IsBoolean, IsNumber, MaxLength, IsObject } from 'class-validator';

/**
 * NotificationChannelPreference.Set Request DTO
 * Source: specs/notification/notification.pillar.v2.yml
 *
 * HTTP: PUT /v1/notification-preferences/{preference_id}/channels/{channel}
 * Idempotency: Via UNIQUE(preference_id, channel)
 */
export class NotificationChannelPreferenceSetRequestDto {
  @IsString()
  @MaxLength(20)
  channel: string;

  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  destination?: string;

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsObject()
  meta?: any;
}
