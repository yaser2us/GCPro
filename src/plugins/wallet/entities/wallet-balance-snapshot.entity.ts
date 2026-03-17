import {
  Entity,
  Column,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  PrimaryColumn,
} from 'typeorm';
import { Wallet } from './wallet.entity';

/**
 * WalletBalanceSnapshot Entity
 * Real-time wallet balance snapshot (single row per wallet)
 *
 * Based on: specs/wallet/wallet.pillar.v2.yml
 */
@Entity('wallet_balance_snapshot')
export class WalletBalanceSnapshot {
  @PrimaryColumn({ type: 'bigint', unsigned: true })
  wallet_id: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: '0.00' })
  available_amount: string; // Available balance (can be spent)

  @Column({ type: 'decimal', precision: 18, scale: 2, default: '0.00' })
  held_amount: string; // Held balance (pending/locked)

  @Column({ type: 'decimal', precision: 18, scale: 2, default: '0.00' })
  total_amount: string; // Total balance (available + held)

  @Column({ type: 'varchar', length: 8, default: 'MYR' })
  currency: string;

  @Column({ type: 'datetime' })
  as_of: Date; // Snapshot timestamp

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;

  // Relations
  @OneToOne(() => Wallet, (wallet) => wallet.balance_snapshot)
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;
}
