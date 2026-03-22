import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * MedicalCase Entity
 * Maps to: medical_case table
 * Source: specs/claim/claim.pillar.v2.yml lines 693-795
 *
 * Purpose: Hospital admission cases for tracking
 */
@Entity('medical_case')
@Index('uk_medical_case_number', ['case_number'], { unique: true })
@Index('idx_case_policy', ['policy_id', 'status'])
@Index('idx_case_provider', ['provider_id', 'status'])
@Index('idx_case_person', ['person_id'])
export class MedicalCase {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 64 })
  case_number: string;

  @Column({ type: 'bigint', unsigned: true })
  account_id: number;

  @Column({ type: 'bigint', unsigned: true })
  person_id: number;

  @Column({ type: 'bigint', unsigned: true })
  policy_id: number;

  @Column({ type: 'bigint', unsigned: true })
  provider_id: number;

  @Column({ type: 'varchar', length: 16, default: 'emergency' })
  admission_type: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  diagnosis_code: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  diagnosis_text: string | null;

  @Column({ type: 'datetime', nullable: true })
  admitted_at: Date | null;

  @Column({ type: 'datetime', nullable: true })
  discharged_at: Date | null;

  @Column({ type: 'varchar', length: 32, default: 'reported' })
  status: string;

  @Column({ type: 'json', nullable: true })
  eligibility_snapshot: any | null;

  @Column({ type: 'json', nullable: true })
  meta_json: any | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
