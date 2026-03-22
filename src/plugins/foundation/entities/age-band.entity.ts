import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * AgeBand Entity
 * Age band reference table. Used for age-factor based premium calculations.
 * Based on specs/foundation/foundation.pillar.v2.yml
 */
@Entity('age_band')
@Index('uk_age_band_code', ['code'], { unique: true })
@Index('idx_age_band_range', ['min_age', 'max_age'])
export class AgeBand {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 32, name: 'code' })
  code: string;

  @Column({ type: 'int', name: 'min_age' })
  min_age: number;

  @Column({ type: 'int', name: 'max_age' })
  max_age: number;

  @Column({ type: 'decimal', precision: 8, scale: 3, default: '1.000', name: 'age_factor' })
  age_factor: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  created_at: Date;
}
