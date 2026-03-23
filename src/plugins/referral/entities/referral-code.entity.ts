import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * ReferralCode Entity
 * Maps to: referral_code table
 * Source: specs/referral/referral.pillar.yml lines 124-187
 *
 * Purpose: User-owned referral codes for a program
 */
@Entity('referral_code')
@Index('uk_rc_program_code', ['program_id', 'code'], { unique: true })
@Index('idx_rc_owner', ['owner_user_id', 'status'])
export class ReferralCode {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  program_id: number;

  @Column({ type: 'bigint', unsigned: true })
  owner_user_id: number;

  @Column({ type: 'varchar', length: 32 })
  code: string;

  @Column({ type: 'varchar', length: 16, default: 'referral' })
  code_type: string; // 'referral' | 'invite'

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: string;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
