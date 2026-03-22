import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * MedicalUnderwritingEvidence Entity
 * Maps to: medical_underwriting_evidence table
 * Source: specs/claim/claim.pillar.v2.yml lines 1252-1311
 *
 * Purpose: Evidence documents and surveys for underwriting cases
 */
@Entity('medical_underwriting_evidence')
@Index('idx_muwe_case_time', ['case_id', 'created_at'])
@Index('idx_muwe_survey', ['survey_response_id'])
export class MedicalUnderwritingEvidence {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  case_id: number;

  @Column({ type: 'varchar', length: 32, default: 'survey' })
  evidence_type: string;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  survey_response_id: number | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  note: string | null;

  @Column({ type: 'json', nullable: true })
  meta_json: any | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
