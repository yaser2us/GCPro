import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

/**
 * SurveyQuestionOption Entity
 * Maps to: survey_question_option table
 * Source: specs/survey/survey.pillar.v2.yml
 *
 * Purpose: Options for choice-based questions
 */
@Entity('survey_question_option')
export class SurveyQuestionOption {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  question_id: number;

  @Column({ type: 'varchar', length: 128 })
  value: string;

  @Column({ type: 'varchar', length: 255 })
  label: string;

  @Column({ type: 'int', default: 0 })
  sort_order: number;
}
