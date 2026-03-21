import { IsString, IsOptional, IsBoolean, IsArray, MaxLength } from 'class-validator';

/**
 * CreatePolicy Request DTO
 * Source: specs/policy/policy.pillar.v2.yml lines 1358-1390
 *
 * HTTP: POST /api/v1/policy/create
 * Idempotency: Via Idempotency-Key header
 */
export class CreatePolicyRequestDto {
  @IsString()
  account_id: string;

  @IsString()
  holder_person_id: string;

  @IsString()
  @MaxLength(32)
  package_code: string;

  @IsOptional()
  @IsString()
  start_at?: string;

  @IsOptional()
  @IsBoolean()
  auto_renew?: boolean;

  @IsOptional()
  @IsArray()
  members?: any[];

  @IsString()
  idempotency_key: string;
}
