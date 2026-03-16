import { IsString, IsOptional, IsNumber, MaxLength, IsObject } from 'class-validator';

/**
 * NotificationSchedule.Create Request DTO
 * Source: specs/notification/notification.pillar.v2.yml
 *
 * HTTP: POST /v1/notifications/{message_id}/schedules
 * Idempotency: Via Idempotency-Key header
 */
export class NotificationScheduleCreateRequestDto {
  @IsString()
  @MaxLength(20)
  schedule_type: string;

  @IsOptional()
  @IsNumber()
  step_no?: number;

  @IsOptional()
  @IsNumber()
  delay_minutes?: number;

  @IsString()
  fire_at: string;

  @IsOptional()
  @IsObject()
  meta?: any;
}
