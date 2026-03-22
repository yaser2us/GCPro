import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * DiscountProgram Entity
 * Discount program definition with type, value, eligibility rules and active window.
 * Based on specs/foundation/foundation.pillar.v2.yml
 */
@Entity('discount_program')
@Index('uk_discount_code', ['code'], { unique: true })
@Index('idx_discount_status', ['status'])
@Index('idx_discount_window', ['starts_at', 'ends_at'])
export class DiscountProgram {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 64, name: 'code' })
  code: string;

  @Column({ type: 'varchar', length: 20, name: 'discount_type' })
  discount_type: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0.00', name: 'value' })
  value: string;

  @Column({ type: 'varchar', length: 40, nullable: true, name: 'eligibility_rule_version' })
  eligibility_rule_version: string | null;

  @Column({ type: 'json', nullable: true, name: 'rule_json' })
  rule_json: any;

  @Column({ type: 'datetime', nullable: true, name: 'starts_at' })
  starts_at: Date | null;

  @Column({ type: 'datetime', nullable: true, name: 'ends_at' })
  ends_at: Date | null;

  @Column({ type: 'varchar', length: 20, default: 'active', name: 'status' })
  status: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  created_at: Date;
}
