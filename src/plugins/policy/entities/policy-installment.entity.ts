import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * PolicyInstallment Entity
 * Maps to: policy_installment table
 * Source: specs/policy/policy.pillar.v2.yml lines 731-824
 *
 * Purpose: Individual installment records for billing plans
 */
@Entity('policy_installment')
@Index('uk_installment_idem', ['idempotency_key'], { unique: true })
@Index('uk_installment_no', ['billing_plan_id', 'installment_no'], { unique: true })
@Index('idx_installment_plan_status', ['billing_plan_id', 'status'])
@Index('idx_installment_due', ['due_at'])
@Index('idx_installment_payment_ref', ['payment_ref'])
export class PolicyInstallment {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  billing_plan_id: number;

  @Column({ type: 'int' })
  installment_no: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0.00' })
  amount: string;

  @Column({ type: 'datetime' })
  due_at: Date;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: 'pending' | 'paid' | 'overdue' | 'waived';

  @Column({ type: 'datetime', nullable: true })
  paid_at: Date | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  payment_method: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  payment_ref: string | null;

  @Column({ type: 'varchar', length: 64 })
  idempotency_key: string;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'datetime', nullable: true })
  last_attempt_at: Date | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  failure_code: string | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
