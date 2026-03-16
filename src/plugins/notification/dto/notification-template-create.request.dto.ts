import { IsString, IsOptional, MaxLength, IsObject } from 'class-validator';

/**
 * NotificationTemplate.Create Request DTO
 * Source: specs/notification/notification.pillar.v2.yml
 *
 * HTTP: POST /v1/notification-templates
 * Idempotency: Via UNIQUE(code, version, locale, channel)
 */
export class NotificationTemplateCreateRequestDto {
  @IsString()
  @MaxLength(80)
  code: string;

  @IsString()
  @MaxLength(160)
  name: string;

  @IsString()
  @MaxLength(20)
  channel: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @IsOptional()
  @IsString()
  subject_tpl?: string;

  @IsString()
  body_tpl: string;

  @IsOptional()
  @IsObject()
  variables_schema_json?: any;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  version?: string;
}
