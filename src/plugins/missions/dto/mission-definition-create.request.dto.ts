import { IsString, IsOptional, IsInt, IsJSON, MaxLength, Min } from 'class-validator';

/**
 * MissionDefinition.Create Request DTO
 * Source: specs/mission/mission.pillar.yml lines 73-84 & command lines 131-176
 *
 * HTTP: POST /v1/missions/definitions
 * Idempotency: Via Idempotency-Key header
 */
export class MissionDefinitionCreateRequestDto {
  @IsString()
  @MaxLength(64)
  code: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsString()
  cadence: string; // e.g., "one_time", "daily", "weekly"

  @IsOptional()
  starts_at?: Date;

  @IsOptional()
  ends_at?: Date;

  @IsOptional()
  @IsInt()
  @Min(0)
  max_total?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  max_per_user?: number;

  @IsOptional()
  criteria_json?: any; // JSON object for mission criteria

  @IsOptional()
  reward_json?: any; // JSON object for reward configuration
}
