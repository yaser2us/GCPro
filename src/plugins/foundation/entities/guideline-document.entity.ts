import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * GuidelineDocument Entity
 * A legal or policy document (e.g. Privacy Policy, T&C). Versioned separately.
 * Based on specs/foundation/foundation.pillar.v2.yml
 */
@Entity('guideline_document')
@Index('uk_guideline_doc_code', ['code'], { unique: true })
@Index('idx_guideline_doc_status', ['status'])
@Index('idx_guideline_doc_scope', ['scope_type', 'scope_ref_type', 'scope_ref_id'])
export class GuidelineDocument {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 64, name: 'code' })
  code: string;

  @Column({ type: 'varchar', length: 160, name: 'name' })
  name: string;

  @Column({ type: 'varchar', length: 16, default: 'active', name: 'status' })
  status: string;

  @Column({ type: 'varchar', length: 16, default: 'global', name: 'scope_type' })
  scope_type: string;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'scope_ref_type' })
  scope_ref_type: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'scope_ref_id' })
  scope_ref_id: string | null;

  @Column({ type: 'json', nullable: true, name: 'meta_json' })
  meta_json: any;

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
