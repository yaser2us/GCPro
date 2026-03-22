import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * PaymentEvent Entity
 * Represents payment event log for tracking state changes and actions
 * Based on specs/payment/payment.pillar.v2.yml
 */
@Entity('payment_event')
@Index('idx_pe_intent_time', ['intent_id', 'occurred_at'])
@Index('idx_pe_type', ['event_type'])
@Index('fk_pe_intent', ['intent_id'])
export class PaymentEvent {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true, name: 'intent_id' })
  intent_id: number;

  @Column({ type: 'varchar', length: 64, name: 'event_type' })
  event_type: string;

  @Column({ type: 'varchar', length: 16, default: 'system', name: 'actor_type' })
  actor_type: string;

  @Column({ type: 'bigint', unsigned: true, nullable: true, name: 'actor_id' })
  actor_id: number | null;

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'request_id' })
  request_id: string | null;

  @Column({ type: 'json', nullable: true, name: 'payload_json' })
  payload_json: any;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', name: 'occurred_at' })
  occurred_at: Date;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  created_at: Date;
}
