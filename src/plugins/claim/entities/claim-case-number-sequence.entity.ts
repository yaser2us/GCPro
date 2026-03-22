import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * ClaimCaseNumberSequence Entity
 * Maps to: claim_case_number_sequence table
 * Source: specs/claim/claim.pillar.v2.yml lines 250-269
 *
 * Purpose: Sequence generator for claim numbers
 */
@Entity('claim_case_number_sequence')
export class ClaimCaseNumberSequence {
  @PrimaryColumn({ type: 'int' })
  claim_year: number;

  @Column({ type: 'int' })
  next_seq: number;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
