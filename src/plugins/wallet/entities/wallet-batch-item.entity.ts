import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * WalletBatchItem Entity
 * Maps to: wallet_batch_item table
 * Source: specs/wallet-advanced/wallet-advanced.pillar.v2.yml
 *
 * Purpose: Individual item within a wallet batch.
 */
@Entity('wallet_batch_item')
@Index('uk_wbi_idempotency', ['idempotency_key'], { unique: true })
@Index('idx_wbi_batch_status', ['batch_id', 'status'])
@Index('idx_wbi_wallet', ['wallet_id'])
@Index('idx_wbi_account', ['account_id'])
@Index('idx_wbi_ref', ['ref_type', 'ref_id'])
export class WalletBatchItem {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  batch_id: number;

  @Column({ type: 'bigint', unsigned: true })
  wallet_id: number;

  @Column({ type: 'bigint', unsigned: true })
  account_id: number;

  @Column({ type: 'varchar', length: 32 })
  item_type: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 8, default: 'MYR' })
  currency: string;

  @Column({ type: 'varchar', length: 32, default: 'created' })
  status: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  failure_code: string | null;

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
