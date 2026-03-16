import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

/**
 * SurveyAnswer Entity
 * Maps to: survey_answer table
 * Source: specs/survey/survey.pillar.v2.yml
 *
 * Purpose: Individual answers to survey questions
 */
@Entity('survey_answer')
export class SurveyAnswer {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  response_id: number;

  @Column({ type: 'bigint', unsigned: true })
  question_id: number;

  @Column({ type: 'tinyint', nullable: true })
  value_bool: number | null;

  @Column({ type: 'text', nullable: true })
  value_text: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 6, nullable: true })
  value_num: number | null;

  @Column({ type: 'date', nullable: true })
  value_date: Date | null;

  @Column({ type: 'json', nullable: true })
  value_json: any | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
