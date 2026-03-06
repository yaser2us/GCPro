import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * MissionSubmission Entity
 * Maps to: mission_submission table
 * Source: docs/database/mission-DDL.md
 *
 * Purpose: User submission with review workflow and feedback
 */
@Entity('mission_submission')
export class MissionSubmission {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  assignment_id: number;

  @Column({ type: 'varchar', length: 24, default: 'draft' })
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'invalidated';

  @Column({ type: 'text', nullable: true })
  text_content: string | null;

  @Column({ type: 'json', nullable: true })
  meta_json: any | null;

  @Column({ type: 'text', nullable: true })
  feedback: string | null;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  reviewed_by_user_id: number | null;

  @Column({ type: 'datetime', nullable: true })
  reviewed_at: Date | null;

  @Column({ type: 'varchar', length: 128, nullable: true, unique: true })
  idempotency_key: string | null;

  @Column({ type: 'datetime', nullable: true })
  submitted_at: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
