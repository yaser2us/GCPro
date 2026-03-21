import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * PolicyBenefitEntitlement Entity
 * Maps to: policy_benefit_entitlement table
 * Source: specs/policy/policy.pillar.v2.yml lines 280-348
 *
 * Purpose: Policy benefit entitlements linked to benefit catalog
 */
@Entity('policy_benefit_entitlement')
@Index('uk_policy_entitlement_active', ['policy_id', 'status'], { unique: true })
@Index('idx_policy_entitlement_policy', ['policy_id'])
export class PolicyBenefitEntitlement {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint' })
  policy_id: number;

  @Column({ type: 'varchar', length: 64 })
  catalog_code_snapshot: string;

  @Column({ type: 'varchar', length: 40 })
  catalog_version_snapshot: string;

  @Column({ type: 'varchar', length: 32 })
  level_code_snapshot: string;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: 'active' | 'expired' | 'superseded';

  @Column({ type: 'datetime', nullable: true })
  start_at: Date | null;

  @Column({ type: 'datetime', nullable: true })
  end_at: Date | null;

  @Column({ type: 'json' })
  entitlement_json: any;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
