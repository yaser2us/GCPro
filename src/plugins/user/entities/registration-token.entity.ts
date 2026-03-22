import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * RegistrationToken Entity
 * Maps to: registration_token table
 * Source: specs/user-identity/user-identity.pillar.v2.yml
 *
 * Purpose: Email/phone verification tokens and OTPs issued during registration flows.
 * No FK — tokens exist before the user record does.
 */
@Entity('registration_token')
@Index('idx_regtok_channel', ['channel_type', 'channel_value'])
@Index('idx_regtok_invite', ['invite_code'])
@Index('idx_regtok_token', ['token'])
@Index('idx_regtok_status_expires', ['status', 'expires_at'])
export class RegistrationToken {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 32, default: 'registration' })
  purpose: string;

  @Column({ type: 'varchar', length: 16 })
  channel_type: string;

  @Column({ type: 'varchar', length: 255 })
  channel_value: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  invite_code: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  token: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  otp_hash: string | null;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status: string;

  @Column({ type: 'json', nullable: true })
  meta_json: any | null;

  @Column({ type: 'datetime' })
  expires_at: Date;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
