import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * CrowdPeriodClaim Entity
 * Claims included in a period with eligibility tracking and approved amount snapshot.
 * Table: crowd_period_claim
 * Based on specs/crowd/crowd.pillar.v2.yml
 */
@Entity('crowd_period_claim')
@Index('uk_period_claim', ['crowd_period_id', 'claim_id'], { unique: true })
@Index('idx_period_claim_period_key', ['period_key'])
@Index('idx_period_claim_status', ['crowd_period_id', 'status'])
@Index('idx_period_claim_claim_id', ['claim_id'])
export class CrowdPeriodClaim {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true, name: 'crowd_period_id' })
  crowd_period_id: number;

  @Column({ type: 'bigint', unsigned: true, name: 'claim_id' })
  claim_id: number;

  @Column({ type: 'varchar', length: 20, name: 'period_key' })
  period_key: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0.00', name: 'approved_amount_snapshot' })
  approved_amount_snapshot: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'eligibility_version' })
  eligibility_version: string | null;

  @Column({ type: 'varchar', length: 20, default: 'included', name: 'status' })
  status: string;

  @Column({ type: 'json', nullable: true, name: 'meta' })
  meta: any;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  created_at: Date;
}
