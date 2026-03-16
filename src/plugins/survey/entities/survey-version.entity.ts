import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * SurveyVersion Entity
 * Maps to: survey_version table
 * Source: specs/survey/survey.pillar.v2.yml
 *
 * Purpose: Survey version management with schema and logic
 */
@Entity('survey_version')
export class SurveyVersion {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  survey_id: number;

  @Column({ type: 'varchar', length: 32 })
  version: string;

  @Column({ type: 'varchar', length: 16, default: 'draft' })
  status: 'draft' | 'published' | 'archived';

  @Column({ type: 'json', nullable: true })
  schema_json: any | null;

  @Column({ type: 'json', nullable: true })
  logic_json: any | null;

  @Column({ type: 'json', nullable: true })
  meta_json: any | null;

  @Column({ type: 'datetime', nullable: true })
  published_at: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
