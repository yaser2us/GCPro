import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * MissionAssignment Entity
 * Maps to: mission_assignment table
 * Source: docs/database/mission-DDL.md
 *
 * Purpose: Per-user mission instance tracking status and lifecycle
 */
@Entity('mission_assignment')
export class MissionAssignment {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  mission_id: number;

  @Column({ type: 'bigint', unsigned: true })
  user_id: number;

  @Column({ type: 'varchar', length: 16, default: 'assigned' })
  status: 'assigned' | 'in_progress' | 'submitted' | 'completed' | 'cancelled';

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  assigned_at: Date;

  @Column({ type: 'datetime', nullable: true })
  started_at: Date | null;

  @Column({ type: 'datetime', nullable: true })
  completed_at: Date | null;

  @Column({ type: 'datetime', nullable: true })
  expires_at: Date | null;

  @Column({ type: 'varchar', length: 128, nullable: true, unique: true })
  idempotency_key: string | null;

  @Column({ type: 'json', nullable: true })
  meta_json: any | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
