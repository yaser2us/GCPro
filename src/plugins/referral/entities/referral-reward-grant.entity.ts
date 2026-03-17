import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * ReferralRewardGrant Entity
 * Maps to: referral_reward_grant table
 * Source: specs/referral/referral.pillar.yml lines 547-663
 *
 * Purpose: Rewards granted for successful referrals
 */
@Entity('referral_reward_grant')
@Index('uk_rrg_conversion_role', ['conversion_id', 'beneficiary_role'], { unique: true })
@Index('uk_rrg_idempotency', ['idempotency_key'], { unique: true })
@Index('idx_rrg_user_time', ['beneficiary_user_id', 'granted_at'])
@Index('idx_rrg_ref', ['ref_type', 'ref_id'])
export class ReferralRewardGrant {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  program_id: number;

  @Column({ type: 'bigint', unsigned: true })
  conversion_id: number;

  @Column({ type: 'bigint', unsigned: true })
  beneficiary_user_id: number;

  @Column({ type: 'varchar', length: 32 })
  beneficiary_role: string;

  @Column({ type: 'varchar', length: 16, default: 'coins' })
  reward_type: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 16, default: 'COIN' })
  currency: string;

  @Column({ type: 'varchar', length: 16, default: 'granted' })
  status: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ref_type: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  ref_id: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  idempotency_key: string | null;

  @Column({ type: 'json', nullable: true })
  meta_json: any | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  granted_at: Date;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
