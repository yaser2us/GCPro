import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * CommissionProgram Entity
 * Maps to: commission_program table
 * Source: specs/commission/commission.pillar.v2.yml lines 83-143
 *
 * Purpose: Commission program catalog with settlement cycles and currency configuration
 */
@Entity('commission_program')
@Index('uk_cp_code', ['code'], { unique: true })
@Index('idx_cp_status', ['status'])
export class CommissionProgram {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 64 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: 'active' | 'paused' | 'retired';

  @Column({ type: 'varchar', length: 16, default: 'MYR' })
  currency: string;

  @Column({ type: 'varchar', length: 16, default: 'monthly' })
  settlement_cycle: string;

  @Column({ type: 'json', nullable: true })
  meta_json: any | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
