import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * ReferralInvite Entity
 * Maps to: referral_invite table
 * Source: specs/referral/referral.pillar.yml lines 189-287
 *
 * Purpose: Individual referral invitations sent to potential users
 */
@Entity('referral_invite')
@Index('uk_ri_invite_token', ['invite_token'], { unique: true })
@Index('idx_ri_referrer_status', ['referrer_user_id', 'status'])
@Index('idx_ri_program_time', ['program_id', 'created_at'])
export class ReferralInvite {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  program_id: number;

  @Column({ type: 'bigint', unsigned: true })
  referral_code_id: number;

  @Column({ type: 'bigint', unsigned: true })
  referrer_user_id: number;

  @Column({ type: 'varchar', length: 16, default: 'link' })
  channel_type: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  channel_value: string | null;

  @Column({ type: 'varchar', length: 128 })
  invite_token: string;

  @Column({ type: 'varchar', length: 24, default: 'created' })
  status: string;

  @Column({ type: 'datetime', nullable: true })
  sent_at: Date | null;

  @Column({ type: 'datetime', nullable: true })
  clicked_at: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
