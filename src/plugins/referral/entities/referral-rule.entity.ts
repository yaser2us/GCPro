import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * ReferralRule Entity
 * Maps to: referral_rule table
 * Source: specs/referral/referral.pillar.yml lines 289-354
 *
 * Purpose: Rules and conditions for referral program eligibility and rewards
 */
@Entity('referral_rule')
@Index('uk_rr_program_rulecode', ['program_id', 'rule_code'], { unique: true })
@Index('idx_rr_rule_code', ['rule_code'])
export class ReferralRule {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  program_id: number;

  @Column({ type: 'varchar', length: 64 })
  rule_code: string;

  @Column({ type: 'varchar', length: 16, default: 'eq' })
  operator: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  value_str: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 6, nullable: true })
  value_num: number | null;

  @Column({ type: 'json', nullable: true })
  value_json: any | null;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: string;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
