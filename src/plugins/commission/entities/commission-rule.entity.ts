import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * CommissionRule Entity
 * Maps to: commission_rule table
 * Source: specs/commission/commission.pillar.v2.yml lines 219-310
 *
 * Purpose: Commission calculation rules with conditions, rates, and priority
 */
@Entity('commission_rule')
@Index('uk_cr_program_code', ['program_id', 'code'], { unique: true })
@Index('idx_cr_program_status_priority', ['program_id', 'status', 'priority'])
@Index('idx_cr_effective', ['effective_from', 'effective_to'])
export class CommissionRule {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  program_id: number;

  @Column({ type: 'varchar', length: 64 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: string;

  @Column({ type: 'varchar', length: 16, default: 'percent' })
  rule_type: string;

  @Column({ type: 'decimal', precision: 8, scale: 4, nullable: true })
  rate_pct: number | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  amount_fixed: number | null;

  @Column({ type: 'int', default: 100 })
  priority: number;

  @Column({ type: 'json', nullable: true })
  conditions_json: any | null;

  @Column({ type: 'json', nullable: true })
  meta_json: any | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  effective_from: Date;

  @Column({ type: 'datetime', nullable: true })
  effective_to: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
