import { IsString } from 'class-validator';

/**
 * MemberChargeMarkChargedDto
 * DTO for marking a member charge as charged
 * Based on specs/crowd/crowd.pillar.v2.yml
 */
export class MemberChargeMarkChargedDto {
  @IsString()
  paidAmount: string;
}
