import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Request DTO for mission definition state changes (Publish, Pause, Retire)
 * Based on missions.pillar.v1.yml lines 216-218
 */
export class MissionDefinitionStateChangeRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string; // Optional reason for state change
}
