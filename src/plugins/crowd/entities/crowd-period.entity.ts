import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * CrowdPeriod Entity
 * Root aggregate for a Takaful sharing period.
 * Table: crowd_period
 * Based on specs/crowd/crowd.pillar.v2.yml
 */
@Entity('crowd_period')
@Index('uk_crowd_period_uuid', ['uuid'], { unique: true })
@Index('uk_crowd_period_key', ['period_key'], { unique: true })
@Index('idx_crowd_period_status', ['status'])
@Index('idx_crowd_period_from_to', ['period_from', 'period_to'])
@Index('idx_crowd_period_completed', ['completed_at'])
export class CrowdPeriod {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'char', length: 36, name: 'uuid' })
  uuid: string;

  @Column({ type: 'varchar', length: 20, name: 'period_key' })
  period_key: string;

  @Column({ type: 'datetime', nullable: true, name: 'period_from' })
  period_from: Date | null;

  @Column({ type: 'datetime', nullable: true, name: 'period_to' })
  period_to: Date | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0.00', name: 'case_required_amount' })
  case_required_amount: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0.00', name: 'last_debt_amount' })
  last_debt_amount: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0.00', name: 'last_extra_amount' })
  last_extra_amount: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0.00', name: 'total_required_amount' })
  total_required_amount: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0.00', name: 'total_collected_amount' })
  total_collected_amount: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0.00', name: 'extra_amount' })
  extra_amount: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0.00', name: 'debt_amount' })
  debt_amount: string;

  @Column({ type: 'int', default: 0, name: 'total_case' })
  total_case: number;

  @Column({ type: 'int', default: 0, name: 'total_member' })
  total_member: number;

  @Column({ type: 'varchar', length: 20, default: 'created', name: 'status' })
  status: string;

  @Column({ type: 'varchar', length: 40, nullable: true, name: 'rule_version' })
  rule_version: string | null;

  @Column({ type: 'datetime', nullable: true, name: 'calculated_at' })
  calculated_at: Date | null;

  @Column({ type: 'datetime', nullable: true, name: 'completed_at' })
  completed_at: Date | null;

  @Column({ type: 'json', nullable: true, name: 'meta' })
  meta: any;

  @Column({ type: 'json', nullable: true, name: 'input_snapshot' })
  input_snapshot: any;

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
