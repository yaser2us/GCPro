import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * FileAccessToken Entity
 * Source: specs/file/file.pillar.v2.yml
 *
 * Temporary access tokens for file downloads
 */
@Entity('file_access_token')
export class FileAccessToken {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  file_id: number;

  @Column({ type: 'varchar', length: 128, unique: true })
  token: string;

  @Column({ type: 'varchar', length: 32, default: 'download' })
  token_type: string;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: string;

  @Column({ type: 'datetime', nullable: true })
  expires_at: Date | null;

  @Column({ type: 'json', nullable: true })
  scopes_json: any | null;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  issued_by_account_id: number | null;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  issued_by_person_id: number | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  issued_for: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  issued_for_value: string | null;

  @Column({ type: 'int', unsigned: true, default: 0 })
  max_uses: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  used_count: number;

  @Column({ type: 'datetime', nullable: true })
  last_used_at: Date | null;

  @Column({ type: 'json', nullable: true })
  meta_json: any | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @Column({ type: 'datetime', nullable: true })
  revoked_at: Date | null;
}
