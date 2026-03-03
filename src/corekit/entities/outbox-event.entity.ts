import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn } from 'typeorm';

/**
 * Outbox event entity
 * Table: core.outbox (from corekit.v1.yaml)
 */
@Entity('outbox', { schema: 'core' })
@Index(['status', 'occurred_at'])
@Index(['aggregate_type', 'aggregate_id'])
@Index(['dedupe_key'], { unique: true, where: 'dedupe_key IS NOT NULL' })
export class OutboxEvent {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 80 })
  event_name: string;

  @Column({ type: 'int' })
  event_version: number;

  @Column({ type: 'varchar', length: 60 })
  aggregate_type: string;

  @Column({ type: 'varchar', length: 120 })
  aggregate_id: string;

  @Column({ type: 'varchar', length: 120 })
  actor_user_id: string;

  @Column({ type: 'timestamp' })
  occurred_at: Date;

  @Column({ type: 'varchar', length: 120 })
  correlation_id: string;

  @Column({ type: 'varchar', length: 120 })
  causation_id: string;

  @Column({ type: 'json' })
  payload: Record<string, any>;

  @Column({ type: 'varchar', length: 120, nullable: true })
  dedupe_key?: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: 'pending' | 'published' | 'failed';

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  published_at?: Date;

  @Column({ type: 'int', default: 0 })
  retry_count: number;

  @Column({ type: 'text', nullable: true })
  error_message?: string;
}
