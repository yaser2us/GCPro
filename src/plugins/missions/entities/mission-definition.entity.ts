import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * MissionDefinition Entity
 * Maps to: mission_definition table
 * Source: docs/database/mission-DDL.md
 *
 * Purpose: Mission catalog with criteria and reward definitions
 */
@Entity('mission_definition')
export class MissionDefinition {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 64, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 16, default: 'global' })
  scope: string;

  @Column({ type: 'varchar', length: 16, default: 'one_time' })
  cadence: string;

  @Column({ type: 'varchar', length: 16, default: 'event' })
  trigger_type: string;

  @Column({ type: 'json', nullable: true })
  criteria_json: any | null;

  @Column({ type: 'json', nullable: true })
  reward_json: any | null;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: 'active' | 'paused' | 'retired';

  @Column({ type: 'datetime', nullable: true })
  start_at: Date | null;

  @Column({ type: 'datetime', nullable: true })
  end_at: Date | null;

  @Column({ type: 'int', unsigned: true, default: 1 })
  max_per_user: number;

  @Column({ type: 'int', unsigned: true, nullable: true })
  max_total: number | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
