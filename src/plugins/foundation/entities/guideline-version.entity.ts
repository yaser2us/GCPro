import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * GuidelineVersion Entity
 * A published version of a guideline document containing the actual content.
 * Based on specs/foundation/foundation.pillar.v2.yml
 */
@Entity('guideline_version')
@Index('uk_guideline_ver', ['document_id', 'version_code', 'locale'], { unique: true })
@Index('idx_guideline_ver_status', ['status', 'effective_from', 'effective_to'])
@Index('idx_guideline_ver_document', ['document_id'])
export class GuidelineVersion {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true, name: 'document_id' })
  document_id: number;

  @Column({ type: 'varchar', length: 32, name: 'version_code' })
  version_code: string;

  @Column({ type: 'varchar', length: 10, default: 'en', name: 'locale' })
  locale: string;

  @Column({ type: 'varchar', length: 16, default: 'draft', name: 'status' })
  status: string;

  @Column({ type: 'datetime', nullable: true, name: 'effective_from' })
  effective_from: Date | null;

  @Column({ type: 'datetime', nullable: true, name: 'effective_to' })
  effective_to: Date | null;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'checksum_sha256' })
  checksum_sha256: string | null;

  @Column({ type: 'varchar', length: 16, default: 'html', name: 'content_type' })
  content_type: string;

  @Column({ type: 'mediumtext', nullable: true, name: 'content_text' })
  content_text: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true, name: 'content_url' })
  content_url: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true, default: 'file_upload', name: 'file_ref_type' })
  file_ref_type: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'file_ref_id' })
  file_ref_id: string | null;

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
