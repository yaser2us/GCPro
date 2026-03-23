import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * Policy Entity
 * Maps to: policy table
 * Source: specs/policy/policy.pillar.v2.yml lines 112-206
 *
 * Purpose: Core policy entity representing insurance policies with lifecycle management
 */
@Entity('policy')
@Index('uk_policy_number', ['policy_number'], { unique: true })
@Index('idx_policy_account', ['account_id'])
@Index('idx_policy_status', ['status'])
@Index('idx_policy_period', ['start_at', 'end_at'])
export class Policy {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 40 })
  policy_number: string;

  @Column({ type: 'bigint' })
  account_id: number;

  @Column({ type: 'bigint' })
  holder_person_id: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: 'pending' | 'active' | 'suspended' | 'expired' | 'cancelled' | 'frozen';

  @Column({ type: 'datetime', nullable: true })
  start_at: Date | null;

  @Column({ type: 'datetime', nullable: true })
  end_at: Date | null;

  @Column({ type: 'tinyint', width: 1, default: 0 })
  auto_renew: number;

  @Column({ type: 'varchar', length: 32, nullable: true })
  package_code_snapshot: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  rule_version: string | null;

  @Column({ type: 'int', default: 7 })
  annual_fee_grace_days: number;

  @Column({ type: 'int', default: 3 })
  annual_fee_retry_limit: number;

  @Column({ type: 'int', default: 14 })
  deposit_topup_grace_days: number;

  @Column({ type: 'json', nullable: true })
  meta: any | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
