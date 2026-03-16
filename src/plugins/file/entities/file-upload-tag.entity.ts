import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * FileUploadTag Entity
 * Source: specs/file/file.pillar.v2.yml
 *
 * File-tag assignments
 */
@Entity('file_upload_tag')
export class FileUploadTag {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  file_id: number;

  @Column({ type: 'bigint', unsigned: true })
  tag_id: number;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
