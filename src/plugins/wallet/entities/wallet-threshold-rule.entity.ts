import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * WalletThresholdRule Entity
 * Maps to: wallet_threshold_rule table
 * Source: specs/wallet-advanced/wallet-advanced.pillar.v2.yml
 *
 * Purpose: Alert threshold configuration per wallet.
 */
@Entity('wallet_threshold_rule')
@Index('uk_wtr_wallet_code', ['wallet_id', 'threshold_code'], { unique: true })
@Index('idx_wtr_status', ['status'])
export class WalletThresholdRule {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  wallet_id: number;

  @Column({ type: 'varchar', length: 32 })
  threshold_code: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  threshold_amount: string;

  @Column({ type: 'varchar', length: 8, default: 'MYR' })
  currency: string;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: string;

  @Column({ type: 'json', nullable: true })
  meta_json: object | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
