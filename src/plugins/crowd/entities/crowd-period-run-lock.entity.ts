import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * CrowdPeriodRunLock Entity
 * Distributed lock with heartbeat for multi-worker coordination.
 * Table: crowd_period_run_lock
 * Based on specs/crowd/crowd.pillar.v2.yml
 */
@Entity('crowd_period_run_lock')
@Index('uk_run_lock_period_key', ['crowd_period_id', 'lock_key'], { unique: true })
@Index('idx_run_lock_status', ['status'])
@Index('idx_run_lock_heartbeat', ['heartbeat_at'])
export class CrowdPeriodRunLock {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true, name: 'crowd_period_id' })
  crowd_period_id: number;

  @Column({ type: 'varchar', length: 64, name: 'lock_key' })
  lock_key: string;

  @Column({ type: 'varchar', length: 64, name: 'owner_instance_id' })
  owner_instance_id: string;

  @Column({ type: 'char', length: 36, name: 'run_id' })
  run_id: string;

  @Column({ type: 'varchar', length: 20, default: 'locked', name: 'status' })
  status: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', name: 'locked_at' })
  locked_at: Date;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', name: 'heartbeat_at' })
  heartbeat_at: Date;

  @Column({ type: 'int', default: 300, name: 'lease_seconds' })
  lease_seconds: number;

  @Column({ type: 'datetime', nullable: true, name: 'released_at' })
  released_at: Date | null;

  @Column({ type: 'json', nullable: true, name: 'meta' })
  meta: any;
}
