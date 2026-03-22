import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * MedicalUnderwritingOutcome Entity
 * Maps to: medical_underwriting_outcome table
 * Source: specs/claim/claim.pillar.v2.yml lines 1012-1098
 *
 * Purpose: Versioned underwriting decisions
 */
@Entity('medical_underwriting_outcome')
@Index('uk_muw_outcome_case_version', ['case_id', 'version_no'], { unique: true })
@Index('idx_muw_outcome_case_time', ['case_id', 'decided_at'])
@Index('idx_muw_outcome_decision_time', ['decision', 'decided_at'])
@Index('idx_muw_outcome_effective', ['effective_from', 'effective_to'])
export class MedicalUnderwritingOutcome {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  case_id: number;

  @Column({ type: 'int', unsigned: true, default: 1 })
  version_no: number;

  @Column({ type: 'varchar', length: 32 })
  decision: string;

  @Column({ type: 'varchar', length: 16, nullable: true })
  risk_level: string | null;

  @Column({ type: 'decimal', precision: 8, scale: 4, nullable: true })
  overall_loading_factor: string | null;

  @Column({ type: 'json', nullable: true })
  decision_reason_json: any | null;

  @Column({ type: 'text', nullable: true })
  decision_notes: string | null;

  @Column({ type: 'datetime' })
  effective_from: Date;

  @Column({ type: 'datetime', nullable: true })
  effective_to: Date | null;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  decided_by_user_id: number | null;

  @Column({ type: 'datetime' })
  decided_at: Date;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
