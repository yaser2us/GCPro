import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

/**
 * OutboxEvent Entity
 * Maps to: outbox_event table
 * Source: docs/database/foundation-DDL.md
 *
 * Purpose: Event publishing contract for reliable event delivery with idempotency
 */
@Entity('outbox_event')
export class OutboxEvent {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 128 })
  topic: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  event_type: string | null;

  @Column({ type: 'varchar', length: 64 })
  aggregate_type: string;

  @Column({ type: 'varchar', length: 128 })
  aggregate_id: string;

  @Column({ type: 'varchar', length: 16, default: 'new' })
  status: 'new' | 'published' | 'archived';

  @Column({ type: 'int', unsigned: true, default: 0 })
  attempts: number;

  @Column({ type: 'varchar', length: 128, nullable: true, unique: true })
  idempotency_key: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  request_id: string | null;

  @Column({ type: 'datetime' })
  occurred_at: Date;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @Column({ type: 'json' })
  payload_json: any;
}
