import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * CrowdPeriodRun Entity
 * Run execution tracking for period calculation.
 * Table: crowd_period_run
 * Based on specs/crowd/crowd.pillar.v2.yml
 */
@Entity('crowd_period_run')
@Index('uk_period_run', ['crowd_period_id', 'run_id'], { unique: true })
@Index('idx_period_run_status', ['crowd_period_id', 'status'])
export class CrowdPeriodRun {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true, name: 'crowd_period_id' })
  crowd_period_id: number;

  @Column({ type: 'char', length: 36, name: 'run_id' })
  run_id: string;

  @Column({ type: 'varchar', length: 20, default: 'system', name: 'triggered_by_actor_type' })
  triggered_by_actor_type: string;

  @Column({ type: 'bigint', unsigned: true, nullable: true, name: 'triggered_by_actor_id' })
  triggered_by_actor_id: number | null;

  @Column({ type: 'varchar', length: 20, default: 'running', name: 'status' })
  status: string;

  @Column({ type: 'varchar', length: 60, nullable: true, name: 'current_step' })
  current_step: string | null;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  error_message: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', name: 'started_at' })
  started_at: Date;

  @Column({ type: 'datetime', nullable: true, name: 'ended_at' })
  ended_at: Date | null;

  @Column({ type: 'json', nullable: true, name: 'summary' })
  summary: any;
}
