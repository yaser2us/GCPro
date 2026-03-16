import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * FileVersion Entity
 * Source: specs/file/file.pillar.v2.yml
 *
 * File version history
 */
@Entity('file_version')
export class FileVersion {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  file_id: number;

  @Column({ type: 'int', unsigned: true })
  version_no: number;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  content_type: string | null;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  size_bytes: number | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  checksum_sha256: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  storage_provider: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  storage_bucket: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  storage_path: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  storage_etag: string | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
