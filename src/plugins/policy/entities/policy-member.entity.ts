import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * PolicyMember Entity
 * Maps to: policy_member table
 * Source: specs/policy/policy.pillar.v2.yml lines 825-894
 *
 * Purpose: Policy members including holder and dependents
 */
@Entity('policy_member')
@Index('uk_policy_person', ['policy_id', 'person_id'], { unique: true })
@Index('idx_policy_member_policy', ['policy_id'])
@Index('idx_policy_member_status', ['policy_id', 'status'])
export class PolicyMember {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  policy_id: number;

  @Column({ type: 'bigint' })
  person_id: number;

  @Column({ type: 'varchar', length: 20, default: 'dependent' })
  role: 'holder' | 'dependent' | 'beneficiary';

  @Column({ type: 'date', nullable: true })
  dob_snapshot: Date | null;

  @Column({ type: 'int', nullable: true })
  age_years_snapshot: number | null;

  @Column({ type: 'tinyint', width: 1, nullable: true })
  smoker_snapshot: number | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: 'active' | 'removed' | 'suspended';

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  added_at: Date;

  @Column({ type: 'datetime', nullable: true })
  removed_at: Date | null;
}
