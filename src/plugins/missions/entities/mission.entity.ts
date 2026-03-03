import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Mission entity - main mission catalog
 * Based on mission.pillar.yml aggregate 'mission'
 * Table: missions.mission
 */
@Entity('mission', { schema: 'missions' })
@Index(['status'])
@Index(['visibility'])
@Index(['external_ref'], { unique: true, where: 'external_ref IS NOT NULL' })
export class Mission {
  @PrimaryColumn('uuid')
  mission_id: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  external_ref?: string; // Client-provided stable reference

  @Column({ type: 'varchar', length: 16, default: 'DRAFT' })
  status: 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'RETIRED';

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'timestamp' })
  starts_at: Date;

  @Column({ type: 'timestamp' })
  ends_at: Date;

  @Column({ type: 'int', nullable: true })
  max_participants?: number;

  @Column({ type: 'json' })
  reward_json: any; // MissionReward object

  @Column({ type: 'json', nullable: true })
  tags_json?: string[];

  @Column({ type: 'varchar', length: 16 })
  visibility: string; // PUBLIC, PRIVATE, etc.

  @Column({ type: 'varchar', length: 120 })
  created_by_user_id: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  updated_by_user_id?: string;

  @Column({ type: 'timestamp', nullable: true })
  published_at?: Date;

  @Column({ type: 'varchar', length: 300, nullable: true })
  pause_reason?: string;

  @Column({ type: 'timestamp', nullable: true })
  paused_at?: Date;

  @Column({ type: 'varchar', length: 300, nullable: true })
  retire_reason?: string;

  @Column({ type: 'timestamp', nullable: true })
  retired_at?: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
