import { IsString, MaxLength } from 'class-validator';

/**
 * Role.Create Request DTO
 * Source: specs/permission/permission.pillar.v2.yml
 *
 * HTTP: POST /v1/roles
 * Idempotency: Via Idempotency-Key header
 */
export class RoleCreateRequestDto {
  @IsString()
  @MaxLength(64)
  code: string;

  @IsString()
  @MaxLength(128)
  name: string;
}
