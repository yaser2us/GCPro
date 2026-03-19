import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * CommissionAccrual Entity
 * Maps to: commission_accrual table
 * Source: specs/commission/commission.pillar.v2.yml lines 312-434
 *
 * Purpose: Commission accrual events tracking earned commissions
 */
@Entity('commission_accrual')
@Index('uk_ca_idempotency', ['idempotency_key'], { unique: true })
@Index('idx_ca_participant_time', ['participant_id', 'occurred_at'])
@Index('idx_ca_program_status_time', ['program_id', 'status', 'occurred_at'])
@Index('idx_ca_source_ref', ['source_ref_type', 'source_ref_id'])
@Index('fk_ca_rule', ['rule_id'])
export class CommissionAccrual {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  program_id: number;

  @Column({ type: 'bigint', unsigned: true })
  participant_id: number;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  rule_id: number | null;

  @Column({ type: 'varchar', length: 24, default: 'recurring' })
  accrual_type: string;

  @Column({ type: 'varchar', length: 16, default: 'MYR' })
  currency: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  base_amount: number | null;

  @Column({ type: 'decimal', precision: 8, scale: 4, nullable: true })
  rate_pct: number | null;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  source_ref_type: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  source_ref_id: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  idempotency_key: string | null;

  @Column({ type: 'varchar', length: 16, default: 'accrued' })
  status: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  occurred_at: Date;

  @Column({ type: 'json', nullable: true })
  meta_json: any | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
