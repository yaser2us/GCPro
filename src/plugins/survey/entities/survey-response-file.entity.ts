import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

/**
 * SurveyResponseFile Entity
 * Maps to: survey_response_file table
 * Source: specs/survey/survey.pillar.v2.yml
 *
 * Purpose: Files attached to survey responses
 */
@Entity('survey_response_file')
export class SurveyResponseFile {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  response_id: number;

  @Column({ type: 'bigint', unsigned: true })
  file_upload_id: number;

  @Column({ type: 'varchar', length: 32, default: 'evidence' })
  kind: string;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @Column({ type: 'json', nullable: true })
  meta_json: any | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
