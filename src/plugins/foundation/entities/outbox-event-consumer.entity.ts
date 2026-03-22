import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * OutboxEventConsumer Entity
 * Tracks per-consumer processing state for outbox events.
 * Enables reliable at-least-once delivery with per-consumer idempotency.
 * Based on specs/foundation/foundation.pillar.v2.yml
 */
@Entity('outbox_event_consumer')
@Index('uk_consumer_event', ['consumer_name', 'event_id'], { unique: true })
@Index('idx_consume_event', ['event_id'])
@Index('idx_consume_consumer_time', ['consumer_name', 'processed_at'])
@Index('idx_oec_pick', ['consumer_name', 'status', 'available_at'])
@Index('idx_oec_lock', ['consumer_name', 'locked_at'])
export class OutboxEventConsumer {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 128, name: 'consumer_name' })
  consumer_name: string;

  @Column({ type: 'bigint', unsigned: true, name: 'event_id' })
  event_id: number;

  @Column({ type: 'varchar', length: 16, default: 'processed', name: 'status' })
  status: string;

  @Column({ type: 'int', unsigned: true, default: 0, name: 'attempts' })
  attempts: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', name: 'available_at' })
  available_at: Date;

  @Column({ type: 'datetime', nullable: true, name: 'locked_at' })
  locked_at: Date | null;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'lock_owner' })
  lock_owner: string | null;

  @Column({ type: 'text', nullable: true, name: 'last_error' })
  last_error: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', name: 'processed_at' })
  processed_at: Date;

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
}
