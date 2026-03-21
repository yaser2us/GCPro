import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * PolicyPackageRate Entity
 * Maps to: policy_package_rate table
 * Source: specs/policy/policy.pillar.v2.yml lines 895-987
 *
 * Purpose: Rate table for policy packages by age, smoker status, and version
 */
@Entity('policy_package_rate')
@Index('uk_rate_unique', ['package_id', 'age_band_id', 'smoker_profile_id', 'rate_version', 'effective_from'], { unique: true })
@Index('idx_rate_lookup', ['package_id', 'age_band_id', 'smoker_profile_id', 'effective_from', 'effective_to'])
@Index('idx_rate_version', ['rate_version'])
@Index('fk_rate_age_band', ['age_band_id'])
@Index('fk_rate_smoker', ['smoker_profile_id'])
export class PolicyPackageRate {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  package_id: number;

  @Column({ type: 'bigint' })
  age_band_id: number;

  @Column({ type: 'bigint' })
  smoker_profile_id: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0.00' })
  annual_fee_amount: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0.00' })
  monthly_max_cap: string;

  @Column({ type: 'decimal', precision: 12, scale: 4, nullable: true })
  weightage_factor: string | null;

  @Column({ type: 'varchar', length: 40 })
  rate_version: string;

  @Column({ type: 'datetime' })
  effective_from: Date;

  @Column({ type: 'datetime', nullable: true })
  effective_to: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
