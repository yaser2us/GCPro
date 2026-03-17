import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Account } from './account.entity';
import { LedgerEntry } from './ledger-entry.entity';

/**
 * LedgerTxn Entity
 * Ledger transaction header (double-entry accounting)
 *
 * Based on: specs/wallet/wallet.pillar.v2.yml
 */
@Entity('ledger_txn')
export class LedgerTxn {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  account_id: number;

  @Column({ type: 'varchar', length: 32 })
  type: string; // mission_reward, deposit, withdrawal, etc.

  @Column({ type: 'varchar', length: 16, default: 'posted' })
  status: string; // posted, voided, reversed

  @Column({ type: 'varchar', length: 64, nullable: true })
  ref_type: string | null; // mission_reward_grant, etc.

  @Column({ type: 'varchar', length: 128, nullable: true })
  ref_id: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  external_ref: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  idempotency_key: string | null;

  @Column({ type: 'json', nullable: true })
  meta_json: object | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  txn_group_key: string | null;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  reversal_of_txn_id: number | null;

  @Column({ type: 'datetime' })
  occurred_at: Date;

  @Column({ type: 'datetime', nullable: true })
  posted_at: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  // Relations
  @ManyToOne(() => Account, (account) => account.ledger_transactions)
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @ManyToOne(() => LedgerTxn)
  @JoinColumn({ name: 'reversal_of_txn_id' })
  reversal_of_txn: LedgerTxn;

  @OneToMany(() => LedgerEntry, (entry) => entry.txn)
  entries: LedgerEntry[];
}
