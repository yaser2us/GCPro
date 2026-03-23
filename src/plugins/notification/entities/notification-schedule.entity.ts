import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * NotificationSchedule Entity
 * Source: specs/notification/notification.pillar.v2.yml
 *
 * Scheduled notifications — two modes:
 *  - message_id set: schedule for an existing notification_message (retry/drip)
 *  - ref_type + ref_id set: generic cross-plugin schedule (e.g. grace_expiry from policy)
 */
@Entity('notification_schedule')
export class NotificationSchedule {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', nullable: true })
  message_id: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  ref_type: string | null;

  @Column({ type: 'bigint', nullable: true })
  ref_id: number | null;

  @Column({ type: 'varchar', length: 20 })
  schedule_type: string;

  @Column({ type: 'int', default: 1 })
  step_no: number;

  @Column({ type: 'int', default: 0 })
  delay_minutes: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string;

  @Column({ type: 'datetime' })
  fire_at: Date;

  @Column({ type: 'datetime', nullable: true })
  fired_at: Date | null;

  @Column({ type: 'json', nullable: true })
  payload_json: any | null;

  @Column({ type: 'json', nullable: true })
  meta: any | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
