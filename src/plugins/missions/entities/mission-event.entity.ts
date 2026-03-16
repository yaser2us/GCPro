import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * MissionEvent Entity
 * Maps to: mission_event table
 * Source: specs/mission/missions.pillar.v2.yml
 *
 * Purpose: Mission event audit log
 */
@Entity('mission_event')
@Index('idx_mevent_assignment_time', ['assignment_id', 'occurred_at'])
@Index('idx_mevent_ref', ['ref_type', 'ref_id'])
export class MissionEvent {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  assignment_id: number;

  @Column({ type: 'varchar', length: 64 })
  event_type: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ref_type: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  ref_id: string | null;

  @Column({ type: 'json', nullable: true })
  payload_json: any | null;

  @Column({ type: 'varchar', length: 128, nullable: true, unique: true })
  idempotency_key: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  occurred_at: Date;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
