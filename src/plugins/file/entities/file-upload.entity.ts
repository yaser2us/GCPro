import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * FileUpload Entity
 * Source: specs/file/file.pillar.v2.yml
 *
 * Main file upload record
 */
@Entity('file_upload')
export class FileUpload {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 64, unique: true })
  file_key: string;

  @Column({ type: 'varchar', length: 20, default: 'created' })
  status: string;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  owner_account_id: number | null;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  owner_person_id: number | null;

  @Column({ type: 'varchar', length: 16, default: 'account' })
  owner_type: string;

  @Column({ type: 'varchar', length: 32, default: 'other' })
  purpose_code: string;

  @Column({ type: 'varchar', length: 16, default: 'private' })
  visibility: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  original_filename: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  content_type: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  extension: string | null;

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

  @Column({ type: 'varchar', length: 64, nullable: true })
  storage_region: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  storage_etag: string | null;

  @Column({ type: 'datetime', nullable: true })
  uploaded_at: Date | null;

  @Column({ type: 'datetime', nullable: true })
  verified_at: Date | null;

  @Column({ type: 'datetime', nullable: true })
  deleted_at: Date | null;

  @Column({ type: 'json', nullable: true })
  meta_json: any | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
