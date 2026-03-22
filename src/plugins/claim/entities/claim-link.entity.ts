import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * ClaimLink Entity
 * Maps to: claim_link table
 * Source: specs/claim/claim.pillar.v2.yml lines 435-484
 *
 * Purpose: Relationships between claims (duplicates, related)
 */
@Entity('claim_link')
@Index('uk_claim_link_unique', ['from_claim_id', 'to_claim_id', 'link_type'], { unique: true })
@Index('idx_claim_link_from', ['from_claim_id'])
@Index('idx_claim_link_to', ['to_claim_id'])
export class ClaimLink {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  from_claim_id: number;

  @Column({ type: 'bigint' })
  to_claim_id: number;

  @Column({ type: 'varchar', length: 30 })
  link_type: string;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
