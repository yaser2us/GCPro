import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { LedgerTxn } from './ledger-txn.entity';
import { Account } from './account.entity';

/**
 * LedgerEntry Entity
 * Ledger entry lines (debits and credits)
 *
 * Based on: specs/wallet/wallet.pillar.v2.yml
 */
@Entity('ledger_entry')
export class LedgerEntry {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  txn_id: number;

  @Column({ type: 'bigint', unsigned: true })
  account_id: number;

  @Column({ type: 'varchar', length: 32, default: 'principal' })
  entry_type: string; // principal, fee, tax

  @Column({ type: 'varchar', length: 8 })
  direction: string; // debit, credit

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 8, default: 'MYR' })
  currency: string;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  // Relations
  @ManyToOne(() => LedgerTxn, (txn) => txn.entries)
  @JoinColumn({ name: 'txn_id' })
  txn: LedgerTxn;

  @ManyToOne(() => Account)
  @JoinColumn({ name: 'account_id' })
  account: Account;
}
