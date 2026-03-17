import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * ReferralEvent Entity
 * Maps to: referral_event table
 * Source: specs/referral/referral.pillar.yml lines 447-545
 *
 * Purpose: Audit log of all referral-related events
 */
@Entity('referral_event')
@Index('uk_revent_idempotency', ['idempotency_key'], { unique: true })
@Index('idx_revent_program_time', ['program_id', 'occurred_at'])
@Index('idx_revent_invite', ['invite_id', 'occurred_at'])
@Index('idx_revent_conversion', ['conversion_id', 'occurred_at'])
@Index('idx_revent_ref', ['ref_type', 'ref_id'])
export class ReferralEvent {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  program_id: number;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  invite_id: number | null;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  conversion_id: number | null;

  @Column({ type: 'varchar', length: 64 })
  event_type: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  actor_user_id: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ref_type: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  ref_id: string | null;

  @Column({ type: 'json', nullable: true })
  payload_json: any | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  idempotency_key: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  occurred_at: Date;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
