import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * GeoState Entity
 * Geographic state / region reference data.
 * Based on specs/foundation/foundation.pillar.v2.yml
 */
@Entity('geo_state')
@Index('uk_geo_state_cc_sc', ['country_code', 'state_code'], { unique: true })
@Index('idx_geo_state_status', ['status'])
@Index('idx_geo_state_name', ['name'])
export class GeoState {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 8, default: 'MY', name: 'country_code' })
  country_code: string;

  @Column({ type: 'varchar', length: 32, name: 'state_code' })
  state_code: string;

  @Column({ type: 'varchar', length: 128, name: 'name' })
  name: string;

  @Column({ type: 'varchar', length: 16, default: 'active', name: 'status' })
  status: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  created_at: Date;
}
