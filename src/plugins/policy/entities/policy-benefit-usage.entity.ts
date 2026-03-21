import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * PolicyBenefitUsage Entity
 * Maps to: policy_benefit_usage table
 * Source: specs/policy/policy.pillar.v2.yml lines 349-432
 *
 * Purpose: Tracks benefit usage and reservations per policy and period
 */
@Entity('policy_benefit_usage')
@Index('uk_policy_usage', ['policy_id', 'period_key', 'item_code'], { unique: true })
@Index('idx_policy_usage_policy_period', ['policy_id', 'period_key'])
@Index('idx_policy_usage_status', ['status'])
export class PolicyBenefitUsage {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint' })
  policy_id: number;

  @Column({ type: 'varchar', length: 32 })
  period_key: string;

  @Column({ type: 'varchar', length: 64 })
  item_code: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: '0.00' })
  used_amount: string;

  @Column({ type: 'int', unsigned: true, default: 0 })
  used_count: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: '0.00' })
  reserved_amount: string;

  @Column({ type: 'int', unsigned: true, default: 0 })
  reserved_count: number;

  @Column({ type: 'varchar', length: 16, default: 'open' })
  status: 'open' | 'closed' | 'archived';

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
