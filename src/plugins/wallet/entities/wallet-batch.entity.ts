import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * WalletBatch Entity
 * Maps to: wallet_batch table
 * Source: specs/wallet-advanced/wallet-advanced.pillar.v2.yml
 *
 * Purpose: Groups multiple wallet operations into a single batch.
 */
@Entity('wallet_batch')
@Index('uk_wb_idempotency', ['idempotency_key'], { unique: true })
@Index('idx_wb_type_status', ['batch_type', 'status'])
@Index('idx_wb_ref', ['ref_type', 'ref_id'])
@Index('idx_wb_created', ['created_at'])
export class WalletBatch {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 32 })
  batch_type: string;

  @Column({ type: 'varchar', length: 32, default: 'created' })
  status: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ref_type: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  ref_id: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  idempotency_key: string | null;

  @Column({ type: 'int', unsigned: true, default: 0 })
  total_items: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  success_items: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  failed_items: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  attempts: number;

  @Column({ type: 'json', nullable: true })
  meta_json: object | null;

  @Column({ type: 'datetime', nullable: true })
  started_at: Date | null;

  @Column({ type: 'datetime', nullable: true })
  completed_at: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
