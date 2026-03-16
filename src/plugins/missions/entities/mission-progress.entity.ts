import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * MissionProgress Entity
 * Maps to: mission_progress table
 * Source: specs/mission/missions.pillar.v2.yml
 *
 * Purpose: Mission progress tracking
 */
@Entity('mission_progress')
@Index('uk_mprog_assignment_metric', ['assignment_id', 'metric_code'], { unique: true })
@Index('idx_mprog_status', ['status'])
export class MissionProgress {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  assignment_id: number;

  @Column({ type: 'varchar', length: 64 })
  metric_code: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: '0.00' })
  current_value: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: '1.00' })
  target_value: number;

  @Column({ type: 'varchar', length: 16, default: 'tracking' })
  status: string;

  @Column({ type: 'json', nullable: true })
  meta_json: any | null;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
