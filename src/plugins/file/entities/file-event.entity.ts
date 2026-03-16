import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * FileEvent Entity
 * Source: specs/file/file.pillar.v2.yml
 *
 * File audit event log
 */
@Entity('file_event')
export class FileEvent {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  file_id: number;

  @Column({ type: 'varchar', length: 64 })
  event_type: string;

  @Column({ type: 'varchar', length: 16, default: 'system' })
  actor_type: string;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  actor_id: number | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  request_id: string | null;

  @Column({ type: 'json', nullable: true })
  payload_json: any | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  occurred_at: Date;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
