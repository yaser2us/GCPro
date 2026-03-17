import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * ReferralConversion Entity
 * Maps to: referral_conversion table
 * Source: specs/referral/referral.pillar.yml lines 356-445
 *
 * Purpose: Successful conversions from referral invites
 */
@Entity('referral_conversion')
@Index('uk_rcv_program_referred_user', ['program_id', 'referred_user_id'], { unique: true })
@Index('uk_rcv_invite_once', ['invite_id'], { unique: true })
@Index('idx_rcv_program_time', ['program_id', 'converted_at'])
@Index('idx_rcv_ref', ['conversion_ref_type', 'conversion_ref_id'])
export class ReferralConversion {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  program_id: number;

  @Column({ type: 'bigint', unsigned: true })
  invite_id: number;

  @Column({ type: 'bigint', unsigned: true })
  referred_user_id: number;

  @Column({ type: 'varchar', length: 24, default: 'converted' })
  status: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  converted_at: Date;

  @Column({ type: 'varchar', length: 64, nullable: true })
  conversion_ref_type: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  conversion_ref_id: string | null;

  @Column({ type: 'json', nullable: true })
  meta_json: any | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
