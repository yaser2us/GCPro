import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * ClaimCase Entity
 * Maps to: claim_case table
 * Source: specs/claim/claim.pillar.v2.yml lines 122-248
 *
 * Purpose: Main claim aggregate for insurance claim submission and processing
 */
@Entity('claim_case')
@Index('uk_claim_number', ['claim_number'], { unique: true })
@Index('uk_claim_year_seq', ['claim_year', 'claim_seq'], { unique: true })
@Index('idx_claim_owner', ['account_id'])
@Index('idx_claim_insurant', ['insurant_person_id'])
@Index('idx_claim_status', ['status'])
@Index('idx_claim_type', ['claim_type'])
@Index('idx_claim_submitted_at', ['submitted_at'])
@Index('idx_claim_admission_date', ['admission_date'])
@Index('idx_claim_duplicate', ['insurant_person_id', 'admission_date', 'hospital_name'])
export class ClaimCase {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 20 })
  claim_number: string;

  @Column({ type: 'int' })
  claim_year: number;

  @Column({ type: 'int' })
  claim_seq: number;

  @Column({ type: 'bigint' })
  account_id: number;

  @Column({ type: 'bigint' })
  claimant_person_id: number;

  @Column({ type: 'bigint' })
  insurant_person_id: number;

  @Column({ type: 'varchar', length: 50 })
  claim_type: string;

  @Column({ type: 'varchar', length: 50 })
  status: string;

  @Column({ type: 'varchar', length: 255 })
  hospital_name: string;

  @Column({ type: 'date' })
  admission_date: Date;

  @Column({ type: 'date', nullable: true })
  discharge_date: Date | null;

  @Column({ type: 'text' })
  diagnosis: string;

  @Column({ type: 'varchar', length: 120 })
  treatment_type: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0.00' })
  requested_amount: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  approved_amount: string | null;

  @Column({ type: 'datetime', nullable: true })
  submitted_at: Date | null;

  @Column({ type: 'datetime', nullable: true })
  decided_at: Date | null;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;

  @Column({ type: 'int', default: 0 })
  version: number;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
