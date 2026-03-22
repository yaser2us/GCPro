import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * SmokProfile Entity
 * Smoker risk profile reference table. Provides loading factors for premium calculations.
 * Based on specs/foundation/foundation.pillar.v2.yml
 */
@Entity('smoker_profile')
@Index('uk_smoker_profile_code', ['code'], { unique: true })
export class SmokProfile {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 32, name: 'code' })
  code: string;

  @Column({ type: 'decimal', precision: 8, scale: 3, default: '1.000', name: 'smoker_factor' })
  smoker_factor: string;

  @Column({ type: 'decimal', precision: 8, scale: 3, default: '0.000', name: 'loading_pct' })
  loading_pct: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  created_at: Date;
}
