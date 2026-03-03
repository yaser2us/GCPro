import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Mission Publish Request DTO
 * Based on mission.pillar.yml MissionPublishRequest (lines 94-96)
 */
export class MissionPublishRequestDto {
  @ApiProperty({
    description: 'Idempotency key for this operation',
    maxLength: 120,
    example: 'publish_mission_abc_20240315_001',
  })
  @IsString()
  @MaxLength(120)
  idempotency_key: string;
}
