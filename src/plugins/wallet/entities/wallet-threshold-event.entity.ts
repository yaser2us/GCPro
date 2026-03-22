import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * WalletThresholdEvent Entity
 * Maps to: wallet_threshold_event table
 * Source: specs/wallet-advanced/wallet-advanced.pillar.v2.yml
 *
 * Purpose: Records a balance threshold breach event. Append-only audit log.
 */
@Entity('wallet_threshold_event')
@Index('uk_wte_idempotency', ['idempotency_key'], { unique: true })
@Index('idx_wte_wallet_time', ['wallet_id', 'occurred_at'])
@Index('idx_wte_code_status', ['threshold_code', 'status'])
export class WalletThresholdEvent {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  wallet_id: number;

  @Column({ type: 'varchar', length: 32 })
  threshold_code: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  current_balance: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  threshold_amount: string;

  @Column({ type: 'varchar', length: 8, default: 'MYR' })
  currency: string;

  @Column({ type: 'varchar', length: 16, default: 'breached' })
  status: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  idempotency_key: string | null;

  @Column({ type: 'json', nullable: true })
  payload_json: object | null;

  @Column({ type: 'datetime' })
  occurred_at: Date;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
