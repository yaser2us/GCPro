import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

/**
 * NotificationSchedule Entity
 * Source: specs/notification/notification.pillar.v2.yml
 *
 * Scheduled notifications
 */
@Entity('notification_schedule')
export class NotificationSchedule {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  message_id: number;

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
  meta: any | null;
}
