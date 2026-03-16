import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * NotificationMessage Entity
 * Source: specs/notification/notification.pillar.v2.yml
 *
 * Main notification message entity
 */
@Entity('notification_message')
export class NotificationMessage {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 120, unique: true })
  message_key: string;

  @Column({ type: 'bigint' })
  template_id: number;

  @Column({ type: 'bigint' })
  account_id: number;

  @Column({ type: 'bigint', nullable: true })
  person_id: number | null;

  @Column({ type: 'varchar', length: 20 })
  channel: string;

  @Column({ type: 'varchar', length: 191, nullable: true })
  destination: string | null;

  @Column({ type: 'varchar', length: 20, default: 'queued' })
  status: string;

  @Column({ type: 'int', default: 5 })
  max_attempts: number;

  @Column({ type: 'int', default: 0 })
  attempt_count: number;

  @Column({ type: 'varchar', length: 60, nullable: true })
  trigger_event_id: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  trigger_event_type: string | null;

  @Column({ type: 'json', nullable: true })
  payload_vars: any | null;

  @Column({ type: 'datetime', nullable: true })
  scheduled_for: Date | null;

  @Column({ type: 'datetime', nullable: true })
  sent_at: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
