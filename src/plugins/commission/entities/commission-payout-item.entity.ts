import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * CommissionPayoutItem Entity
 * Maps to: commission_payout_item table
 * Source: specs/commission/commission.pillar.v2.yml lines 516-609
 *
 * Purpose: Individual payout items within a batch
 */
@Entity('commission_payout_item')
@Index('uk_cpi_batch_participant', ['batch_id', 'participant_id'], { unique: true })
@Index('idx_cpi_status', ['status'])
@Index('idx_cpi_participant', ['participant_id'])
export class CommissionPayoutItem {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  batch_id: number;

  @Column({ type: 'bigint', unsigned: true })
  participant_id: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 16, default: 'MYR' })
  currency: string;

  @Column({ type: 'varchar', length: 16, default: 'wallet' })
  payout_method: string;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  ledger_txn_id: number | null;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  withdrawal_request_id: number | null;

  @Column({ type: 'varchar', length: 16, default: 'planned' })
  status: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  failure_reason: string | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
