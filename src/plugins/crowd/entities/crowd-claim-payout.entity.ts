import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * CrowdClaimPayout Entity
 * Payouts per claim per period with idempotency and ledger linkage.
 * Table: crowd_claim_payout
 * Based on specs/crowd/crowd.pillar.v2.yml
 */
@Entity('crowd_claim_payout')
@Index('uk_claim_payout_idem', ['idempotency_key'], { unique: true })
@Index('uk_claim_payout_once', ['crowd_period_claim_id'], { unique: true })
@Index('idx_claim_payout_status', ['crowd_period_id', 'status'])
export class CrowdClaimPayout {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true, name: 'crowd_period_id' })
  crowd_period_id: number;

  @Column({ type: 'bigint', unsigned: true, name: 'crowd_period_claim_id' })
  crowd_period_claim_id: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: false, name: 'amount' })
  amount: string;

  @Column({ type: 'varchar', length: 20, default: 'wallet', name: 'method' })
  method: string;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'payout_ref' })
  payout_ref: string | null;

  @Column({ type: 'bigint', unsigned: true, nullable: true, name: 'ledger_txn_id' })
  ledger_txn_id: number | null;

  @Column({ type: 'varchar', length: 20, default: 'planned', name: 'status' })
  status: string;

  @Column({ type: 'text', nullable: true, name: 'failure_reason' })
  failure_reason: string | null;

  @Column({ type: 'varchar', length: 64, nullable: false, name: 'idempotency_key' })
  idempotency_key: string;

  @Column({ type: 'json', nullable: true, name: 'meta' })
  meta: any;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  created_at: Date;

  @Column({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
    name: 'updated_at',
  })
  updated_at: Date;
}
