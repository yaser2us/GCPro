import { IsString, IsOptional, MaxLength, IsObject } from 'class-validator';

/**
 * NotificationPreference.Update Request DTO
 * Source: specs/notification/notification.pillar.v2.yml
 *
 * HTTP: PUT /v1/notification-preferences/{preference_id}
 * Idempotency: Via last-write-wins
 */
export class NotificationPreferenceUpdateRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;

  @IsOptional()
  @IsObject()
  quiet_hours?: any;

  @IsOptional()
  @IsObject()
  meta?: any;
}
