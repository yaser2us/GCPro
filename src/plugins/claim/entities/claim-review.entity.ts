import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * ClaimReview Entity
 * Maps to: claim_review table
 * Source: specs/claim/claim.pillar.v2.yml lines 486-539
 *
 * Purpose: Reviewer decisions and assessments
 */
@Entity('claim_review')
@Index('idx_claim_review_claim', ['claim_id', 'created_at'])
@Index('idx_claim_review_reviewer', ['reviewer_id'])
export class ClaimReview {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  claim_id: number;

  @Column({ type: 'bigint' })
  reviewer_id: number;

  @Column({ type: 'varchar', length: 30 })
  reviewer_role: string;

  @Column({ type: 'varchar', length: 40 })
  decision: string;

  @Column({ type: 'text', nullable: true })
  decision_note: string | null;

  @Column({ type: 'datetime', nullable: true })
  decided_at: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
