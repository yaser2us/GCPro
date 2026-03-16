import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

/**
 * SurveyQuestion Entity
 * Maps to: survey_question table
 * Source: specs/survey/survey.pillar.v2.yml
 *
 * Purpose: Questions for a survey version
 */
@Entity('survey_question')
export class SurveyQuestion {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  survey_version_id: number;

  @Column({ type: 'varchar', length: 64 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  label: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  help_text: string | null;

  @Column({ type: 'varchar', length: 16 })
  answer_type: string;

  @Column({ type: 'tinyint', default: 0 })
  required: number;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @Column({ type: 'json', nullable: true })
  rules_json: any | null;

  @Column({ type: 'json', nullable: true })
  meta_json: any | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
