import {
  Entity,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
} from 'typeorm';
import { Account } from './account.entity';

/**
 * AccountPerson Entity
 * Links accounts to persons (many-to-many relationship)
 *
 * Based on: specs/wallet/wallet.pillar.v2.yml
 */
@Entity('account_person')
export class AccountPerson {
  @PrimaryColumn({ type: 'bigint', unsigned: true })
  account_id: number;

  @PrimaryColumn({ type: 'bigint', unsigned: true })
  person_id: number;

  @Column({ type: 'varchar', length: 16, default: 'owner' })
  role: string; // owner, authorized, etc.

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  // Relations
  @ManyToOne(() => Account, (account) => account.account_persons)
  @JoinColumn({ name: 'account_id' })
  account: Account;

  // Note: Person entity is in person plugin, so we don't define the relation here
}
