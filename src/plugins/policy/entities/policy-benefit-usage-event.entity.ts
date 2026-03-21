import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * PolicyBenefitUsageEvent Entity
 * Maps to: policy_benefit_usage_event table
 * Source: specs/policy/policy.pillar.v2.yml lines 433-512
 *
 * Purpose: Immutable event log of benefit usage changes
 */
@Entity('policy_benefit_usage_event')
@Index('uk_usage_event_idem', ['idempotency_key'], { unique: true })
@Index('idx_usage_event_usage_time', ['usage_id', 'occurred_at'])
@Index('idx_usage_event_ref', ['ref_type', 'ref_id'])
export class PolicyBenefitUsageEvent {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  usage_id: number;

  @Column({ type: 'varchar', length: 16 })
  event_type: 'reserve' | 'confirm' | 'release' | 'adjust';

  @Column({ type: 'varchar', length: 32, nullable: true })
  ref_type: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  ref_id: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: '0.00' })
  amount: string;

  @Column({ type: 'int', unsigned: true, default: 0 })
  count: number;

  @Column({ type: 'varchar', length: 128 })
  idempotency_key: string;

  @Column({ type: 'json', nullable: true })
  payload_json: any | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  occurred_at: Date;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
