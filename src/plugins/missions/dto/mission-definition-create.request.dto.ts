import { IsString, IsOptional, IsInt, IsEnum, MaxLength, Min, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * MissionDefinition.Create Request DTO
 * Source: specs/mission/missions.pillar.v2.yml lines 780-792
 *
 * HTTP: POST /v1/missions/definitions
 * Idempotency: Via Idempotency-Key header
 */
export class MissionDefinitionCreateRequestDto {
  @IsString()
  @MaxLength(64)
  code: string;

  @IsString()
  @MaxLength(128)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  scope?: string;

  @IsString()
  @MaxLength(16)
  @IsEnum(['one_time', 'daily', 'weekly', 'monthly'])
  cadence: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  trigger_type?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  start_at?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  end_at?: Date;

  @IsOptional()
  @IsInt()
  @Min(1)
  max_per_user?: number;

  @IsOptional()
  @IsInt()
  max_total?: number;

  @IsOptional()
  criteria_json?: any;

  @IsOptional()
  reward_json?: any;
}
