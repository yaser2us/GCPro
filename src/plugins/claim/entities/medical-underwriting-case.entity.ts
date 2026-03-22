import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * MedicalUnderwritingCase Entity
 * Maps to: medical_underwriting_case table
 * Source: specs/claim/claim.pillar.v2.yml lines 915-1010
 *
 * Purpose: Medical underwriting cases for pre-existing conditions assessment
 */
@Entity('medical_underwriting_case')
@Index('uk_muw_case_no', ['case_no'], { unique: true })
@Index('idx_muw_subject_time', ['subject_ref_id', 'created_at'])
@Index('idx_muw_context_time', ['context_ref_id', 'created_at'])
@Index('idx_muw_status_time', ['status', 'updated_at'])
export class MedicalUnderwritingCase {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  subject_ref_id: number;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  context_ref_id: number | null;

  @Column({ type: 'varchar', length: 64 })
  case_no: string;

  @Column({ type: 'varchar', length: 16, default: 'open' })
  status: string;

  @Column({ type: 'varchar', length: 16, nullable: true })
  channel: string | null;

  @Column({ type: 'varchar', length: 16, default: 'normal' })
  priority: string;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  created_by_user_id: number | null;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  assigned_to_user_id: number | null;

  @Column({ type: 'json', nullable: true })
  meta_json: any | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;

  @Column({ type: 'datetime', nullable: true })
  closed_at: Date | null;
}
