import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * BenefitCatalog Entity
 * Versioned benefit catalog header. Groups benefit items and levels for a given product version.
 * Based on specs/foundation/foundation.pillar.v2.yml
 */
@Entity('benefit_catalog')
@Index('uk_benefit_catalog_code_ver', ['code', 'version'], { unique: true })
@Index('idx_benefit_catalog_status', ['status'])
@Index('idx_benefit_catalog_effective', ['effective_from', 'effective_to'])
export class BenefitCatalog {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 64, name: 'code' })
  code: string;

  @Column({ type: 'varchar', length: 160, name: 'name' })
  name: string;

  @Column({ type: 'varchar', length: 16, default: 'active', name: 'status' })
  status: string;

  @Column({ type: 'varchar', length: 40, default: 'v1', name: 'version' })
  version: string;

  @Column({ type: 'datetime', nullable: true, name: 'effective_from' })
  effective_from: Date | null;

  @Column({ type: 'datetime', nullable: true, name: 'effective_to' })
  effective_to: Date | null;

  @Column({ type: 'json', nullable: true, name: 'meta_json' })
  meta_json: any;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  created_at: Date;
}
