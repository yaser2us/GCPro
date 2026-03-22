import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * ClaimSettlementFlag Entity
 * Maps to: claim_settlement_flag table
 * Source: specs/claim/claim.pillar.v2.yml lines 541-609
 *
 * Purpose: Settlement eligibility per crowdfunding period
 */
@Entity('claim_settlement_flag')
@Index('uk_claim_period', ['claim_id', 'period_key'], { unique: true })
@Index('idx_period_eligible', ['period_key', 'eligible'])
@Index('idx_claim_settlement', ['claim_id'])
export class ClaimSettlementFlag {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  claim_id: number;

  @Column({ type: 'char', length: 7 })
  period_key: string;

  @Column({ type: 'tinyint', width: 1 })
  eligible: number;

  @Column({ type: 'varchar', length: 60, default: 'OK' })
  reason_code: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'varchar', length: 20 })
  set_by_actor_type: string;

  @Column({ type: 'bigint', nullable: true })
  set_by_actor_id: number | null;

  @Column({ type: 'datetime' })
  set_at: Date;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
