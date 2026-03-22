import { Entity, Column, PrimaryGeneratedColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * MedicalUnderwritingCurrentOutcome Entity
 * Maps to: medical_underwriting_current_outcome table
 * Source: specs/claim/claim.pillar.v2.yml lines 1176-1250
 *
 * Purpose: Current active outcome pointer per subject-context combination
 */
@Entity('medical_underwriting_current_outcome')
@Index('uk_muw_current_subject_context', ['subject_ref_id', 'context_ref_id'], { unique: true })
@Index('idx_muw_current_subject', ['subject_ref_id'])
@Index('fk_muw_current_context_ref', ['context_ref_id'])
@Index('fk_muw_current_case', ['case_id'])
@Index('fk_muw_current_outcome', ['outcome_id'])
export class MedicalUnderwritingCurrentOutcome {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  subject_ref_id: number;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  context_ref_id: number | null;

  @Column({ type: 'bigint', unsigned: true })
  case_id: number;

  @Column({ type: 'bigint', unsigned: true })
  outcome_id: number;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
