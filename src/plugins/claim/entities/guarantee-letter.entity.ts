import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * GuaranteeLetter Entity
 * Maps to: guarantee_letter table
 * Source: specs/claim/claim.pillar.v2.yml lines 611-691
 *
 * Purpose: Guarantee letters for cashless hospitalization
 */
@Entity('guarantee_letter')
@Index('uk_gl_number', ['gl_number'], { unique: true })
@Index('uk_gl_case', ['medical_case_id'], { unique: true })
@Index('idx_gl_status', ['status'])
@Index('idx_gl_valid', ['valid_from', 'valid_until'])
export class GuaranteeLetter {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  medical_case_id: number;

  @Column({ type: 'varchar', length: 64 })
  gl_number: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  approved_limit_amount: string;

  @Column({ type: 'varchar', length: 8, default: 'MYR' })
  currency: string;

  @Column({ type: 'varchar', length: 32, default: 'issued' })
  status: string;

  @Column({ type: 'datetime' })
  valid_from: Date;

  @Column({ type: 'datetime' })
  valid_until: Date;

  @Column({ type: 'json', nullable: true })
  coverage_snapshot: any | null;

  @Column({ type: 'json', nullable: true })
  meta_json: any | null;

  @Column({ type: 'datetime' })
  issued_at: Date;

  @Column({ type: 'datetime', nullable: true })
  cancelled_at: Date | null;
}
