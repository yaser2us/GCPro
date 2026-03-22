import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * WalletSpendIntent Entity
 * Maps to: wallet_spend_intent table
 * Source: specs/wallet-advanced/wallet-advanced.pillar.v2.yml
 *
 * Purpose: Intent to spend (debit) funds from a wallet.
 */
@Entity('wallet_spend_intent')
@Index('uk_wsi_idempotency', ['idempotency_key'], { unique: true })
@Index('idx_wsi_wallet_status', ['wallet_id', 'status'])
@Index('idx_wsi_account', ['account_id'])
@Index('idx_wsi_ref', ['ref_type', 'ref_id'])
export class WalletSpendIntent {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  wallet_id: number;

  @Column({ type: 'bigint', unsigned: true })
  account_id: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 8, default: 'MYR' })
  currency: string;

  @Column({ type: 'varchar', length: 32, default: 'created' })
  status: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ref_type: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  ref_id: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  idempotency_key: string | null;

  @Column({ type: 'json', nullable: true })
  meta_json: object | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
