import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * CrowdPackageBucket Entity
 * Period breakdown by package with weightage and per-member sharing cost.
 * Table: crowd_package_bucket
 * Based on specs/crowd/crowd.pillar.v2.yml
 */
@Entity('crowd_package_bucket')
@Index('uk_bucket_period_package', ['crowd_period_id', 'package_id'], { unique: true })
@Index('idx_bucket_period', ['crowd_period_id'])
@Index('idx_bucket_package', ['package_id'])
export class CrowdPackageBucket {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true, name: 'crowd_period_id' })
  crowd_period_id: number;

  @Column({ type: 'bigint', unsigned: true, name: 'package_id' })
  package_id: number;

  @Column({ type: 'varchar', length: 32, nullable: true, name: 'package_code_snapshot' })
  package_code_snapshot: string | null;

  @Column({ type: 'decimal', precision: 8, scale: 3, default: '1.000', name: 'weightage' })
  weightage: string;

  @Column({ type: 'int', default: 0, name: 'member_count' })
  member_count: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0.00', name: 'sharing_cost_each' })
  sharing_cost_each: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0.00', name: 'sharing_cost_total' })
  sharing_cost_total: string;

  @Column({ type: 'json', nullable: true, name: 'meta' })
  meta: any;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  created_at: Date;

  @Column({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
    name: 'updated_at',
  })
  updated_at: Date;
}
