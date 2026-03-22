import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * BankProfile Entity
 * Maps to: bank_profile table
 * Source: docs/database/FULL-DDL.md
 *
 * Purpose: Stores verified bank account details for payouts and withdrawals.
 * Referenced by: commission_participant, wallet_withdrawal_request
 */
@Entity('bank_profile')
@Index('idx_bank_profile_account', ['account_id'])
@Index('idx_bank_profile_status', ['status'])
export class BankProfile {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  account_id: number;

  @Column({ type: 'varchar', length: 32 })
  bank_code: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  bank_name: string | null;

  @Column({ type: 'varchar', length: 255 })
  holder_name: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  account_no_masked: string | null;

  @Column({ type: 'varbinary', length: 512, nullable: true })
  account_no_encrypted: Buffer | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  account_type: string | null;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status: string;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
