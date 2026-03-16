import { IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * Permission.Update Request DTO
 * Source: specs/permission/permission.pillar.v2.yml
 *
 * HTTP: PUT /v1/permissions/{permission_id}
 * Idempotency: Via Idempotency-Key header
 */
export class PermissionUpdateRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  scope?: string;
}
