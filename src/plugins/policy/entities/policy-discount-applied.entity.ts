import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * PolicyDiscountApplied Entity
 * Maps to: policy_discount_applied table
 * Source: specs/policy/policy.pillar.v2.yml lines 670-730
 *
 * Purpose: Records of discounts applied to policies
 */
@Entity('policy_discount_applied')
@Index('idx_policy_discount_policy', ['policy_id'])
@Index('idx_policy_discount_program', ['discount_program_id'])
export class PolicyDiscountApplied {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  policy_id: number;

  @Column({ type: 'bigint' })
  discount_program_id: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0.00' })
  amount_applied: string;

  @Column({ type: 'varchar', length: 40, default: 'annual_fee' })
  applied_to: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  applied_at: Date;

  @Column({ type: 'json', nullable: true })
  meta: any | null;
}
