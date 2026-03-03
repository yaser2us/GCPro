import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Mission Approve Submission Request DTO
 * Based on mission.pillar.yml MissionApproveSubmissionRequest
 */
export class MissionApproveSubmissionRequestDto {
  @ApiProperty({
    description: 'Idempotency key for this operation',
    maxLength: 120,
    example: 'approve_sub_xyz_20240315_001'
  })
  @IsString()
  @MaxLength(120)
  idempotency_key: string;

  @ApiProperty({
    description: 'Optional approval note',
    required: false,
    maxLength: 1000,
    example: 'Great proof submission! Approved.'
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  approval_note?: string;
}
