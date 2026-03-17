import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Wallet } from './wallet.entity';
import { LedgerTxn } from './ledger-txn.entity';
import { AccountPerson } from './account-person.entity';

/**
 * Account Entity
 * Polymorphic container for ledger and wallets
 *
 * Based on: specs/wallet/wallet.pillar.v2.yml
 */
@Entity('account')
export class Account {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 16 })
  type: string; // user, merchant, system, etc.

  @Column({ type: 'varchar', length: 32, default: 'active' })
  status: string; // active, suspended, closed

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;

  // Relations
  @OneToMany(() => Wallet, (wallet) => wallet.account)
  wallets: Wallet[];

  @OneToMany(() => LedgerTxn, (txn) => txn.account)
  ledger_transactions: LedgerTxn[];

  @OneToMany(() => AccountPerson, (ap) => ap.account)
  account_persons: AccountPerson[];
}
