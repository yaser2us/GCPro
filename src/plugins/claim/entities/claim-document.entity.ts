import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * ClaimDocument Entity
 * Maps to: claim_document table
 * Source: specs/claim/claim.pillar.v2.yml lines 271-318
 *
 * Purpose: Supporting documents attached to claims
 */
@Entity('claim_document')
@Index('uk_claim_doc_unique', ['claim_id', 'file_upload_id'], { unique: true })
@Index('idx_claim_doc_claim', ['claim_id'])
@Index('idx_claim_doc_type', ['document_type'])
export class ClaimDocument {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  claim_id: number;

  @Column({ type: 'bigint' })
  file_upload_id: number;

  @Column({ type: 'varchar', length: 80 })
  document_type: string;

  @Column({ type: 'bigint', nullable: true })
  uploaded_by: number | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
