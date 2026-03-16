import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * NotificationPreference Entity
 * Source: specs/notification/notification.pillar.v2.yml
 *
 * User notification preferences
 */
@Entity('notification_preference')
export class NotificationPreference {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  account_id: number;

  @Column({ type: 'bigint', nullable: true })
  person_id: number | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @Column({ type: 'json', nullable: true })
  quiet_hours: any | null;

  @Column({ type: 'json', nullable: true })
  meta: any | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
