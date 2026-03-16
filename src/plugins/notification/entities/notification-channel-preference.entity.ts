import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * NotificationChannelPreference Entity
 * Source: specs/notification/notification.pillar.v2.yml
 *
 * Channel-specific preferences
 */
@Entity('notification_channel_preference')
export class NotificationChannelPreference {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  preference_id: number;

  @Column({ type: 'varchar', length: 20 })
  channel: string;

  @Column({ type: 'tinyint', default: 1 })
  enabled: number;

  @Column({ type: 'varchar', length: 191, nullable: true })
  destination: string | null;

  @Column({ type: 'int', default: 1 })
  priority: number;

  @Column({ type: 'json', nullable: true })
  meta: any | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
