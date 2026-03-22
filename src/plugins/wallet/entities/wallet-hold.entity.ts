import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * WalletHold Entity
 * Maps to: wallet_hold table
 * Source: specs/wallet-advanced/wallet-advanced.pillar.v2.yml
 *
 * Purpose: Places a hold on a portion of wallet balance.
 */
@Entity('wallet_hold')
@Index('uk_wallet_hold_idempotency', ['idempotency_key'], { unique: true })
@Index('idx_wh_wallet_status', ['wallet_id', 'status'])
@Index('idx_wh_reason', ['reason_code'])
@Index('idx_wh_ref', ['ref_type', 'ref_id'])
@Index('idx_wh_expires', ['expires_at'])
@Index('idx_wallet_hold_ref', ['ref_type', 'ref_id'])
@Index('idx_wallet_hold_wallet_status', ['wallet_id', 'status'])
@Index('idx_wallet_hold_expires', ['status', 'expires_at'])
export class WalletHold {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  wallet_id: number;

  @Column({ type: 'varchar', length: 32 })
  reason_code: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 8, default: 'MYR' })
  currency: string;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ref_type: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  ref_id: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  idempotency_key: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  request_id: string | null;

  @Column({ type: 'datetime', nullable: true })
  expires_at: Date | null;

  @Column({ type: 'datetime', nullable: true })
  captured_at: Date | null;

  @Column({ type: 'datetime', nullable: true })
  released_at: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
