import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * SurveyResponse Entity
 * Maps to: survey_response table
 * Source: specs/survey/survey.pillar.v2.yml
 *
 * Purpose: User responses to surveys
 */
@Entity('survey_response')
export class SurveyResponse {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  survey_version_id: number;

  @Column({ type: 'bigint', unsigned: true })
  actor_ref_id: number;

  @Column({ type: 'bigint', unsigned: true })
  subject_ref_id: number;

  @Column({ type: 'varchar', length: 16, default: 'draft' })
  status: 'draft' | 'submitted' | 'completed' | 'invalidated';

  @Column({ type: 'datetime', nullable: true })
  submitted_at: Date | null;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  created_by_user_id: number | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  idempotency_key: string | null;

  @Column({ type: 'json', nullable: true })
  meta_json: any | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
