import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { Account } from './account.entity';
import { WalletBalanceSnapshot } from './wallet-balance-snapshot.entity';

/**
 * Wallet Entity
 * Holds currency balances (coins, fiat, etc.)
 *
 * Based on: specs/wallet/wallet.pillar.v2.yml
 */
@Entity('wallet')
export class Wallet {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  account_id: number;

  @Column({ type: 'varchar', length: 32, default: 'MAIN' })
  wallet_type: string; // MAIN, BONUS, SAVINGS, etc.

  @Column({ type: 'varchar', length: 8, default: 'MYR' })
  currency: string; // MYR, USD, COIN, etc.

  @Column({ type: 'varchar', length: 32, default: 'active' })
  status: string; // active, frozen, closed

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;

  // Relations
  @ManyToOne(() => Account, (account) => account.wallets)
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @OneToOne(() => WalletBalanceSnapshot, (snapshot) => snapshot.wallet)
  balance_snapshot: WalletBalanceSnapshot;
}
