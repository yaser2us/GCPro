import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * PolicyBillingPlan Entity
 * Maps to: policy_billing_plan table
 * Source: specs/policy/policy.pillar.v2.yml lines 513-580
 *
 * Purpose: Policy billing plans defining payment schedules
 */
@Entity('policy_billing_plan')
@Index('idx_billing_plan_policy', ['policy_id'])
@Index('idx_billing_plan_status', ['status'])
export class PolicyBillingPlan {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  policy_id: number;

  @Column({ type: 'varchar', length: 20 })
  billing_type: 'annual' | 'monthly' | 'quarterly';

  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0.00' })
  total_amount: string;

  @Column({ type: 'int', default: 1 })
  installment_count: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: 'pending' | 'active' | 'completed' | 'cancelled';

  @Column({ type: 'datetime', nullable: true })
  activated_at: Date | null;

  @Column({ type: 'datetime', nullable: true })
  completed_at: Date | null;

  @Column({ type: 'json', nullable: true })
  meta: any | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
