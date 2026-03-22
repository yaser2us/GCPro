import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * CrowdPeriodEvent Entity
 * Period lifecycle event log for audit trail. Append-only.
 * Table: crowd_period_event
 * Based on specs/crowd/crowd.pillar.v2.yml
 */
@Entity('crowd_period_event')
@Index('idx_period_event_period', ['crowd_period_id', 'created_at'])
@Index('idx_period_event_type', ['event_type'])
export class CrowdPeriodEvent {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true, name: 'crowd_period_id' })
  crowd_period_id: number;

  @Column({ type: 'varchar', length: 80, name: 'event_type' })
  event_type: string;

  @Column({ type: 'varchar', length: 20, name: 'actor_type' })
  actor_type: string;

  @Column({ type: 'bigint', unsigned: true, nullable: true, name: 'actor_id' })
  actor_id: number | null;

  @Column({ type: 'text', nullable: true, name: 'note' })
  note: string | null;

  @Column({ type: 'json', nullable: true, name: 'payload' })
  payload: any;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  created_at: Date;
}
