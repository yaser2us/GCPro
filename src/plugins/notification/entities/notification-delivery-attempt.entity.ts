import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

/**
 * NotificationDeliveryAttempt Entity
 * Source: specs/notification/notification.pillar.v2.yml
 *
 * Delivery attempt tracking
 */
@Entity('notification_delivery_attempt')
export class NotificationDeliveryAttempt {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  message_id: number;

  @Column({ type: 'int' })
  attempt_no: number;

  @Column({ type: 'varchar', length: 40 })
  provider: string;

  @Column({ type: 'varchar', length: 20, default: 'sending' })
  status: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  provider_ref: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  error_code: string | null;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @Column({ type: 'json', nullable: true })
  provider_payload: any | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  started_at: Date;

  @Column({ type: 'datetime', nullable: true })
  finished_at: Date | null;
}
