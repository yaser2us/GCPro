import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * CrowdMemberCharge Entity
 * Charges per member per period with payment tracking and idempotency.
 * Table: crowd_member_charge
 * Based on specs/crowd/crowd.pillar.v2.yml
 */
@Entity('crowd_member_charge')
@Index('uk_member_charge_idem', ['idempotency_key'], { unique: true })
@Index('uk_member_charge_period_insurant', ['crowd_period_id', 'insurant_id'], { unique: true })
@Index('idx_member_charge_period_status', ['crowd_period_id', 'status'])
@Index('idx_member_charge_insurant', ['insurant_id'])
@Index('idx_member_charge_due', ['due_at'])
@Index('fk_member_charge_bucket', ['package_bucket_id'])
export class CrowdMemberCharge {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true, name: 'crowd_period_id' })
  crowd_period_id: number;

  @Column({ type: 'bigint', unsigned: true, name: 'insurant_id' })
  insurant_id: number;

  @Column({ type: 'bigint', unsigned: true, name: 'package_bucket_id' })
  package_bucket_id: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0.00', name: 'charge_amount' })
  charge_amount: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'cap_amount' })
  cap_amount: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true, name: 'calc_version' })
  calc_version: string | null;

  @Column({ type: 'json', nullable: true, name: 'calc_breakdown' })
  calc_breakdown: any;

  @Column({ type: 'varchar', length: 20, default: 'planned', name: 'status' })
  status: string;

  @Column({ type: 'int', default: 0, name: 'attempts' })
  attempts: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0.00', name: 'paid_amount' })
  paid_amount: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0.00', name: 'remaining_amount' })
  remaining_amount: string;

  @Column({ type: 'datetime', nullable: true, name: 'due_at' })
  due_at: Date | null;

  @Column({ type: 'datetime', nullable: true, name: 'last_attempt_at' })
  last_attempt_at: Date | null;

  @Column({ type: 'varchar', length: 64, nullable: false, name: 'idempotency_key' })
  idempotency_key: string;

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
