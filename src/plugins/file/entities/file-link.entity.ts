import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

/**
 * FileLink Entity
 * Source: specs/file/file.pillar.v2.yml
 *
 * Polymorphic links between files and entities
 */
@Entity('file_link')
export class FileLink {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  file_id: number;

  @Column({ type: 'varchar', length: 32 })
  target_type: string;

  @Column({ type: 'varchar', length: 128 })
  target_id: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  role_code: string | null;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: string;

  @Column({ type: 'json', nullable: true })
  meta_json: any | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  linked_at: Date;

  @Column({ type: 'datetime', nullable: true })
  removed_at: Date | null;
}
