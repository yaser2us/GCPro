import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Mission Enroll Request DTO
 * Based on mission.pillar.yml MissionEnrollRequest
 */
export class MissionEnrollRequestDto {
  @ApiProperty({
    description: 'Idempotency key for this operation',
    maxLength: 120,
    example: 'enroll_mission_abc_user_123_20240315'
  })
  @IsString()
  @MaxLength(120)
  idempotency_key: string;
}
