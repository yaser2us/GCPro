import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * PolicyDepositRequirement Entity
 * Maps to: policy_deposit_requirement table
 * Source: specs/policy/policy.pillar.v2.yml lines 581-669
 *
 * Purpose: Policy deposit requirement tracking and thresholds
 */
@Entity('policy_deposit_requirement')
@Index('uk_deposit_req_policy', ['policy_id'], { unique: true })
@Index('idx_deposit_req_status', ['status'])
export class PolicyDepositRequirement {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  policy_id: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0.00' })
  monthly_max_cap: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0.00' })
  deposit_capacity_amount: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0.00' })
  min_required_amount: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0.00' })
  warning_amount: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0.00' })
  urgent_amount: string;

  @Column({ type: 'bigint', nullable: true })
  deposit_wallet_id: number | null;

  @Column({ type: 'varchar', length: 20, default: 'ok' })
  status: 'ok' | 'warning' | 'urgent' | 'critical';

  @Column({ type: 'datetime', nullable: true })
  last_evaluated_at: Date | null;

  @Column({ type: 'json', nullable: true })
  meta: any | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
