import { IsString, IsOptional, IsDateString, IsInt, IsObject, IsArray, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Mission Reward DTO
 * Based on mission.pillar.yml MissionReward type
 */
export class MissionRewardDto {
  @ApiProperty({ example: 'FIXED' })
  @IsString()
  reward_type: string;

  @ApiProperty({
    example: { currency: 'MYR', amount_minor: 5000 },
    description: 'Money object with currency and amount_minor'
  })
  @IsObject()
  reward_money: {
    currency: string;
    amount_minor: number;
  };

  @ApiProperty({ example: 'MISSION_COMPLETION' })
  @IsString()
  reward_reason: string;
}

/**
 * Mission Create Request DTO
 * Based on mission.pillar.yml MissionCreateRequest
 */
export class MissionCreateRequestDto {
  @ApiProperty({
    description: 'Idempotency key for this operation',
    maxLength: 120,
    example: 'create_mission_xyz_20240315_001'
  })
  @IsString()
  @MaxLength(120)
  idempotency_key: string;

  @ApiProperty({
    description: 'Client-provided stable reference',
    required: false,
    maxLength: 80,
    example: 'MISSION-2024-Q1-001'
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  external_ref?: string;

  @ApiProperty({
    description: 'Mission title',
    minLength: 3,
    maxLength: 200,
    example: 'Complete 5 Policy Applications'
  })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'Mission description',
    required: false,
    maxLength: 5000,
    example: 'Submit and get approved for 5 policy applications this month'
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({ example: '2024-03-01T00:00:00Z' })
  @IsDateString()
  starts_at: string;

  @ApiProperty({ example: '2024-03-31T23:59:59Z' })
  @IsDateString()
  ends_at: string;

  @ApiProperty({
    description: 'Maximum number of participants',
    required: false,
    example: 100
  })
  @IsOptional()
  @IsInt()
  max_participants?: number;

  @ApiProperty({ type: MissionRewardDto })
  @ValidateNested()
  @Type(() => MissionRewardDto)
  reward: MissionRewardDto;

  @ApiProperty({
    description: 'Mission tags',
    required: false,
    type: [String],
    example: ['sales', 'q1-2024']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({
    example: 'PUBLIC',
    description: 'Mission visibility'
  })
  @IsString()
  visibility: string;
}
