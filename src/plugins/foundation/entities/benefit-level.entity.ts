import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * BenefitLevel Entity
 * Coverage level within a benefit catalog. Allows tiered coverage.
 * Based on specs/foundation/foundation.pillar.v2.yml
 */
@Entity('benefit_level')
@Index('uk_benefit_level', ['catalog_id', 'level_code'], { unique: true })
@Index('idx_benefit_level_sort', ['catalog_id', 'sort_order'])
@Index('fk_benefit_level_catalog', ['catalog_id'])
export class BenefitLevel {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true, name: 'catalog_id' })
  catalog_id: number;

  @Column({ type: 'varchar', length: 32, name: 'level_code' })
  level_code: string;

  @Column({ type: 'varchar', length: 128, name: 'level_name' })
  level_name: string;

  @Column({ type: 'int', default: 0, name: 'sort_order' })
  sort_order: number;

  @Column({ type: 'json', nullable: true, name: 'meta_json' })
  meta_json: any;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  created_at: Date;
}
