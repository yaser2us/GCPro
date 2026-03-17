import { IsString, MaxLength } from 'class-validator';

/**
 * ReferralInvite.Click Request DTO
 * Source: specs/referral/referral.pillar.yml lines 877-879
 *
 * HTTP: POST /v1/referral/invites/click
 * Idempotency: Via Idempotency-Key header
 */
export class ReferralInviteClickRequestDto {
  @IsString()
  @MaxLength(128)
  invite_token: string;
}
