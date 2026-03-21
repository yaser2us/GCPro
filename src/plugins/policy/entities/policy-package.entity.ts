import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * PolicyPackage Entity
 * Maps to: policy_package table
 * Source: specs/policy/policy.pillar.v2.yml lines 207-279
 *
 * Purpose: Policy package catalog defining coverage tiers and parameters
 */
@Entity('policy_package')
@Index('uk_policy_package_code', ['code'], { unique: true })
@Index('idx_policy_package_name', ['name'])
export class PolicyPackage {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 32 })
  code: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0.00' })
  monthly_max_cap_default: string;

  @Column({ type: 'decimal', precision: 8, scale: 3, default: '2.000' })
  deposit_capacity_multiplier: string;

  @Column({ type: 'decimal', precision: 8, scale: 3, default: '0.500' })
  min_deposit_pct: string;

  @Column({ type: 'decimal', precision: 8, scale: 3, default: '0.600' })
  warning_pct: string;

  @Column({ type: 'decimal', precision: 8, scale: 3, default: '0.500' })
  urgent_pct: string;

  @Column({ type: 'json', nullable: true })
  meta: any | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
