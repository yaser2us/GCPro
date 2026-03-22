import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * ClaimEvent Entity
 * Maps to: claim_event table
 * Source: specs/claim/claim.pillar.v2.yml lines 320-385
 *
 * Purpose: Immutable audit trail of claim activities
 */
@Entity('claim_event')
@Index('idx_claim_event_claim', ['claim_id', 'created_at'])
@Index('idx_claim_event_type', ['event_type'])
export class ClaimEvent {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  claim_id: number;

  @Column({ type: 'varchar', length: 80 })
  event_type: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  from_status: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  to_status: string | null;

  @Column({ type: 'varchar', length: 20 })
  actor_type: string;

  @Column({ type: 'bigint', nullable: true })
  actor_id: number | null;

  @Column({ type: 'tinyint', width: 1, default: 0 })
  is_internal_note: number;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
