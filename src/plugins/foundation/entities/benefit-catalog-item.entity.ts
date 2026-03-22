import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * BenefitCatalogItem Entity
 * Individual benefit item within a catalog.
 * Based on specs/foundation/foundation.pillar.v2.yml
 */
@Entity('benefit_catalog_item')
@Index('uk_benefit_item_code', ['catalog_id', 'item_code'], { unique: true })
@Index('idx_benefit_item_status', ['status'])
@Index('idx_benefit_item_category', ['category'])
@Index('fk_benefit_item_catalog', ['catalog_id'])
export class BenefitCatalogItem {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true, name: 'catalog_id' })
  catalog_id: number;

  @Column({ type: 'varchar', length: 64, name: 'item_code' })
  item_code: string;

  @Column({ type: 'varchar', length: 160, name: 'name' })
  name: string;

  @Column({ type: 'varchar', length: 32, default: 'other', name: 'category' })
  category: string;

  @Column({ type: 'varchar', length: 20, default: 'per_year', name: 'limit_type' })
  limit_type: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: '0.00', name: 'limit_amount' })
  limit_amount: string;

  @Column({ type: 'int', unsigned: true, default: 0, name: 'limit_count' })
  limit_count: number;

  @Column({ type: 'varchar', length: 40, nullable: true, name: 'eligibility_rule_version' })
  eligibility_rule_version: string | null;

  @Column({ type: 'json', nullable: true, name: 'eligibility_rule_json' })
  eligibility_rule_json: any;

  @Column({ type: 'varchar', length: 20, default: 'reimburse', name: 'calculation_mode' })
  calculation_mode: string;

  @Column({ type: 'decimal', precision: 8, scale: 3, nullable: true, name: 'percent_value' })
  percent_value: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true, name: 'fixed_amount' })
  fixed_amount: string | null;

  @Column({ type: 'varchar', length: 16, default: 'active', name: 'status' })
  status: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  created_at: Date;
}
