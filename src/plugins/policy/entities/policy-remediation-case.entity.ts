import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * PolicyRemediationCase Entity
 * Maps to: policy_remediation_case table
 * Source: specs/policy/policy.pillar.v2.yml lines 988-1052
 *
 * Purpose: Remediation cases for policy compliance and issue resolution
 */
@Entity('policy_remediation_case')
@Index('idx_remediation_policy_status', ['policy_id', 'status'])
@Index('idx_remediation_grace', ['grace_end_at'])
export class PolicyRemediationCase {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  policy_id: number;

  @Column({ type: 'varchar', length: 60 })
  reason_code: string;

  @Column({ type: 'varchar', length: 20, default: 'open' })
  status: 'open' | 'in_progress' | 'cleared' | 'expired';

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  opened_at: Date;

  @Column({ type: 'datetime', nullable: true })
  grace_end_at: Date | null;

  @Column({ type: 'datetime', nullable: true })
  cleared_at: Date | null;

  @Column({ type: 'datetime', nullable: true })
  expired_at: Date | null;

  @Column({ type: 'json', nullable: true })
  required_actions: any | null;

  @Column({ type: 'json', nullable: true })
  meta: any | null;
}
