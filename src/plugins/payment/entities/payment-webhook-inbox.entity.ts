import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * PaymentWebhookInbox Entity
 * Represents webhook inbox for processing payment provider callbacks
 * Based on specs/payment/payment.pillar.v2.yml
 */
@Entity('payment_webhook_inbox')
@Index('uk_pwi_idempotency', ['idempotency_key'], { unique: true })
@Index('uk_pwi_provider_event', ['provider', 'provider_event_id'], { unique: true })
@Index('idx_pwi_status_time', ['status', 'received_at'])
@Index('idx_pwi_provider_txn', ['provider', 'provider_txn_ref'])
@Index('fk_pwi_attempt', ['attempt_id'])
export class PaymentWebhookInbox {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 32 })
  provider: string;

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'provider_event_id' })
  provider_event_id: string | null;

  @Column({ type: 'varchar', length: 16, default: 'new' })
  status: string;

  @Column({ type: 'varchar', length: 16, default: 'unknown', name: 'signature_status' })
  signature_status: string;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'intent_key' })
  intent_key: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'provider_txn_ref' })
  provider_txn_ref: string | null;

  @Column({ type: 'bigint', unsigned: true, nullable: true, name: 'attempt_id' })
  attempt_id: number | null;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'received_ip' })
  received_ip: string | null;

  @Column({ type: 'json', nullable: true, name: 'headers_json' })
  headers_json: any;

  @Column({ type: 'json', name: 'payload_json' })
  payload_json: any;

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'idempotency_key' })
  idempotency_key: string | null;

  @Column({ type: 'int', unsigned: true, default: 0 })
  attempts: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', name: 'received_at' })
  received_at: Date;

  @Column({ type: 'datetime', nullable: true, name: 'processed_at' })
  processed_at: Date | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  created_at: Date;
}
