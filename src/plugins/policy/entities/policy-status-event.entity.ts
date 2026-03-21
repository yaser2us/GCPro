import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * PolicyStatusEvent Entity
 * Maps to: policy_status_event table
 * Source: specs/policy/policy.pillar.v2.yml lines 1053-1123
 *
 * Purpose: Immutable event log of policy status transitions and lifecycle events
 */
@Entity('policy_status_event')
@Index('idx_policy_event_policy', ['policy_id', 'created_at'])
@Index('idx_policy_event_type', ['event_type'])
export class PolicyStatusEvent {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  policy_id: number;

  @Column({ type: 'varchar', length: 60 })
  event_type: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  from_status: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  to_status: string | null;

  @Column({ type: 'varchar', length: 60 })
  trigger_code: string;

  @Column({ type: 'varchar', length: 20 })
  actor_type: 'user' | 'system' | 'admin';

  @Column({ type: 'bigint', nullable: true })
  actor_id: number | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'json', nullable: true })
  payload: any | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
