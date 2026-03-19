import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * CommissionPayoutBatch Entity
 * Maps to: commission_payout_batch table
 * Source: specs/commission/commission.pillar.v2.yml lines 436-514
 *
 * Purpose: Payout batch orchestration for settlement periods
 */
@Entity('commission_payout_batch')
@Index('uk_cpb_program_batch', ['program_id', 'batch_code'], { unique: true })
@Index('idx_cpb_program_status', ['program_id', 'status'])
@Index('idx_cpb_period', ['period_start', 'period_end'])
export class CommissionPayoutBatch {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  program_id: number;

  @Column({ type: 'varchar', length: 64 })
  batch_code: string;

  @Column({ type: 'varchar', length: 16, default: 'planned' })
  status: string;

  @Column({ type: 'varchar', length: 16, default: 'MYR' })
  currency: string;

  @Column({ type: 'datetime' })
  period_start: Date;

  @Column({ type: 'datetime' })
  period_end: Date;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0.00 })
  total_amount: number;

  @Column({ type: 'json', nullable: true })
  meta_json: any | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
