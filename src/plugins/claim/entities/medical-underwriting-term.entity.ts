import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * MedicalUnderwritingTerm Entity
 * Maps to: medical_underwriting_term table
 * Source: specs/claim/claim.pillar.v2.yml lines 1100-1174
 *
 * Purpose: Terms, exclusions, loadings attached to underwriting outcomes
 */
@Entity('medical_underwriting_term')
@Index('idx_muw_term_outcome', ['outcome_id'])
@Index('idx_muw_term_type', ['term_type'])
@Index('idx_muw_term_code', ['code'])
export class MedicalUnderwritingTerm {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  outcome_id: number;

  @Column({ type: 'varchar', length: 16 })
  term_type: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  code: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string | null;

  @Column({ type: 'decimal', precision: 8, scale: 4, nullable: true })
  value_factor: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  value_amount: string | null;

  @Column({ type: 'int', unsigned: true, nullable: true })
  value_days: number | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  value_text: string | null;

  @Column({ type: 'json', nullable: true })
  meta_json: any | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
