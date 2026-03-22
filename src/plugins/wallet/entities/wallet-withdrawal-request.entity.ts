import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * WalletWithdrawalRequest Entity
 * Maps to: wallet_withdrawal_request table
 * Source: specs/wallet-advanced/wallet-advanced.pillar.v2.yml
 *
 * Purpose: Request to withdraw funds from a wallet to a bank account.
 */
@Entity('wallet_withdrawal_request')
@Index('idx_wwr_wallet_status', ['wallet_id', 'status'])
@Index('idx_wwr_account', ['account_id'])
@Index('idx_wwr_bank', ['bank_profile_id'])
@Index('idx_wwr_requested', ['requested_at'])
export class WalletWithdrawalRequest {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  wallet_id: number;

  @Column({ type: 'bigint', unsigned: true })
  account_id: number;

  @Column({ type: 'bigint', unsigned: true })
  bank_profile_id: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 8, default: 'MYR' })
  currency: string;

  @Column({ type: 'varchar', length: 32, default: 'requested' })
  status: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  reject_reason_code: string | null;

  @Column({ type: 'json', nullable: true })
  meta_json: object | null;

  @Column({ type: 'datetime' })
  requested_at: Date;

  @Column({ type: 'datetime', nullable: true })
  decided_at: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
