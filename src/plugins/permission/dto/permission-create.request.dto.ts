import { IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * Permission.Create Request DTO
 * Source: specs/permission/permission.pillar.v2.yml
 *
 * HTTP: POST /v1/permissions
 * Idempotency: Via Idempotency-Key header
 */
export class PermissionCreateRequestDto {
  @IsString()
  @MaxLength(128)
  code: string;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  scope?: string;
}
