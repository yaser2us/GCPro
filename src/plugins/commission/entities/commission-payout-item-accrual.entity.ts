import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * CommissionPayoutItemAccrual Entity
 * Maps to: commission_payout_item_accrual table
 * Source: specs/commission/commission.pillar.v2.yml lines 611-658
 *
 * Purpose: Links accruals to payout items for traceability
 */
@Entity('commission_payout_item_accrual')
@Index('uk_cpia_once', ['payout_item_id', 'accrual_id'], { unique: true })
@Index('idx_cpia_accrual', ['accrual_id'])
export class CommissionPayoutItemAccrual {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  payout_item_id: number;

  @Column({ type: 'bigint', unsigned: true })
  accrual_id: number;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
