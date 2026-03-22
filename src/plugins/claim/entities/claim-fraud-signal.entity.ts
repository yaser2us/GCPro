import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * ClaimFraudSignal Entity
 * Maps to: claim_fraud_signal table
 * Source: specs/claim/claim.pillar.v2.yml lines 387-433
 *
 * Purpose: Fraud detection signals and risk indicators
 */
@Entity('claim_fraud_signal')
@Index('idx_claim_fraud_claim', ['claim_id', 'created_at'])
@Index('idx_claim_fraud_type', ['signal_type'])
@Index('idx_claim_fraud_score', ['signal_score'])
export class ClaimFraudSignal {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  claim_id: number;

  @Column({ type: 'varchar', length: 60 })
  signal_type: string;

  @Column({ type: 'int' })
  signal_score: number;

  @Column({ type: 'json', nullable: true })
  signal_payload: any | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
