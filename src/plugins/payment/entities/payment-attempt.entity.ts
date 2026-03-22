import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * PaymentAttempt Entity
 * Represents payment processing attempts for tracking retries and provider responses
 * Based on specs/payment/payment.pillar.v2.yml
 */
@Entity('payment_attempt')
@Index('uk_pa_intent_attempt', ['intent_id', 'attempt_no'], { unique: true })
@Index('idx_pa_status_time', ['status', 'created_at'])
@Index('idx_pa_provider_txn', ['provider', 'provider_txn_ref'])
@Index('fk_pa_intent', ['intent_id'])
export class PaymentAttempt {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true, name: 'intent_id' })
  intent_id: number;

  @Column({ type: 'int', unsigned: true, default: 1, name: 'attempt_no' })
  attempt_no: number;

  @Column({ type: 'varchar', length: 16, default: 'initiated' })
  status: string;

  @Column({ type: 'varchar', length: 32 })
  provider: string;

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'provider_txn_ref' })
  provider_txn_ref: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'provider_status' })
  provider_status: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'failure_code' })
  failure_code: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'failure_message' })
  failure_message: string | null;

  @Column({ type: 'json', nullable: true, name: 'request_json' })
  request_json: any;

  @Column({ type: 'json', nullable: true, name: 'response_json' })
  response_json: any;

  @Column({ type: 'datetime', nullable: true, name: 'started_at' })
  started_at: Date | null;

  @Column({ type: 'datetime', nullable: true, name: 'completed_at' })
  completed_at: Date | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  created_at: Date;
}
