import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * MissionSubmissionFile Entity
 * Maps to: mission_submission_file table
 * Source: specs/mission/missions.pillar.v2.yml
 *
 * Purpose: Mission submission file attachments
 */
@Entity('mission_submission_file')
@Index('idx_msubf_submission', ['submission_id'])
@Index('idx_msubf_file_ref', ['file_ref_type', 'file_ref_id'])
export class MissionSubmissionFile {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  submission_id: number;

  @Column({ type: 'varchar', length: 32, default: 'file_upload' })
  file_ref_type: string;

  @Column({ type: 'varchar', length: 128 })
  file_ref_id: string;

  @Column({ type: 'int', unsigned: true, default: 0 })
  sort_order: number;

  @Column({ type: 'json', nullable: true })
  meta_json: any | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
