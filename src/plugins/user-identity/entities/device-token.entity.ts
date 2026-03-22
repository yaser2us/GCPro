import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * DeviceToken Entity
 * Maps to: device_token table
 * Source: specs/user-identity/user-identity.pillar.v2.yml
 *
 * Purpose: Push notification device tokens per user.
 */
@Entity('device_token')
@Index('uk_device_token', ['platform', 'token'], { unique: true })
@Index('idx_device_user', ['user_id'])
@Index('idx_device_status', ['status'])
export class DeviceToken {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  user_id: number;

  @Column({ type: 'varchar', length: 16 })
  platform: string;

  @Column({ type: 'varchar', length: 512 })
  token: string;

  @Column({ type: 'varchar', length: 32, default: 'active' })
  status: string;

  @Column({ type: 'datetime', nullable: true })
  last_seen_at: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
