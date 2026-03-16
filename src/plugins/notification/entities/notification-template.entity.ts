import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * NotificationTemplate Entity
 * Source: specs/notification/notification.pillar.v2.yml
 *
 * Notification template with versioning
 */
@Entity('notification_template')
export class NotificationTemplate {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 80 })
  code: string;

  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ type: 'varchar', length: 20 })
  channel: string;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  locale: string;

  @Column({ type: 'text', nullable: true })
  subject_tpl: string | null;

  @Column({ type: 'mediumtext' })
  body_tpl: string;

  @Column({ type: 'json', nullable: true })
  variables_schema_json: any | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @Column({ type: 'varchar', length: 40, default: 'v1' })
  version: string;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
