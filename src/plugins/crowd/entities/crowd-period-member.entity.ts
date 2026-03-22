import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * CrowdPeriodMember Entity
 * Members included in a period with snapshot data for reproducible cost calculations.
 * Table: crowd_period_member
 * Based on specs/crowd/crowd.pillar.v2.yml
 */
@Entity('crowd_period_member')
@Index('uk_period_member', ['crowd_period_id', 'insurant_id'], { unique: true })
@Index('idx_period_member_status', ['crowd_period_id', 'status'])
@Index('idx_period_member_package', ['crowd_period_id', 'package_id'])
export class CrowdPeriodMember {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true, name: 'crowd_period_id' })
  crowd_period_id: number;

  @Column({ type: 'bigint', unsigned: true, name: 'insurant_id' })
  insurant_id: number;

  @Column({ type: 'bigint', unsigned: true, name: 'package_id' })
  package_id: number;

  @Column({ type: 'varchar', length: 20, default: 'active', name: 'status' })
  status: string;

  @Column({ type: 'varchar', length: 60, default: 'OK', name: 'reason_code' })
  reason_code: string;

  @Column({ type: 'text', nullable: true, name: 'note' })
  note: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true, name: 'package_code_snapshot' })
  package_code_snapshot: string | null;

  @Column({ type: 'int', nullable: true, name: 'age_years_snapshot' })
  age_years_snapshot: number | null;

  @Column({ type: 'tinyint', width: 1, nullable: true, name: 'smoker_snapshot' })
  smoker_snapshot: number | null;

  @Column({ type: 'json', nullable: true, name: 'meta' })
  meta: any;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  created_at: Date;
}
