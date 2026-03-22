import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * PaymentIntent Entity
 * Represents payment intents tracking the lifecycle of payment requests
 * Based on specs/payment/payment.pillar.v2.yml
 */
@Entity('payment_intent')
@Index('uk_pi_intent_key', ['intent_key'], { unique: true })
@Index('uk_pi_idempotency', ['idempotency_key'], { unique: true })
@Index('idx_pi_status_time', ['status', 'created_at'])
@Index('idx_pi_account_purpose', ['account_id', 'purpose_code', 'status'])
@Index('idx_pi_ref', ['ref_type', 'ref_id'])
@Index('idx_pi_provider_ref', ['provider', 'provider_intent_ref'])
@Index('fk_pi_payment_method', ['payment_method_id'])
export class PaymentIntent {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 64, name: 'intent_key' })
  intent_key: string;

  @Column({ type: 'varchar', length: 16, name: 'intent_type' })
  intent_type: string;

  @Column({ type: 'bigint', unsigned: true, name: 'account_id' })
  account_id: number;

  @Column({ type: 'bigint', unsigned: true, nullable: true, name: 'person_id' })
  person_id: number | null;

  @Column({ type: 'bigint', unsigned: true, nullable: true, name: 'payment_method_id' })
  payment_method_id: number | null;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 8, default: 'MYR' })
  currency: string;

  @Column({ type: 'varchar', length: 16, default: 'created' })
  status: string;

  @Column({ type: 'varchar', length: 32, default: 'other', name: 'purpose_code' })
  purpose_code: string;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'ref_type' })
  ref_type: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'ref_id' })
  ref_id: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'idempotency_key' })
  idempotency_key: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'request_id' })
  request_id: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  provider: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'provider_intent_ref' })
  provider_intent_ref: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'return_url' })
  return_url: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'callback_url' })
  callback_url: string | null;

  @Column({ type: 'datetime', nullable: true, name: 'expires_at' })
  expires_at: Date | null;

  @Column({ type: 'bigint', unsigned: true, nullable: true, name: 'ledger_txn_id' })
  ledger_txn_id: number | null;

  @Column({ type: 'json', nullable: true, name: 'meta_json' })
  meta_json: any;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  created_at: Date;

  @Column({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
    name: 'updated_at',
  })
  updated_at: Date;

  @Column({ type: 'datetime', nullable: true, name: 'succeeded_at' })
  succeeded_at: Date | null;

  @Column({ type: 'datetime', nullable: true, name: 'failed_at' })
  failed_at: Date | null;
}
