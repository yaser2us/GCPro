import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * CommissionParticipant Entity
 * Maps to: commission_participant table
 * Source: specs/commission/commission.pillar.v2.yml lines 145-217
 *
 * Purpose: Program participants with payout method preferences
 */
@Entity('commission_participant')
@Index('uk_cpart_program_participant', ['program_id', 'participant_type', 'participant_id'], { unique: true })
@Index('idx_cpart_status', ['program_id', 'status'])
export class CommissionParticipant {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  program_id: number;

  @Column({ type: 'varchar', length: 16, default: 'user' })
  participant_type: string;

  @Column({ type: 'bigint', unsigned: true })
  participant_id: number;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: string;

  @Column({ type: 'varchar', length: 16, default: 'wallet' })
  default_payout_method: string;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  wallet_id: number | null;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  bank_profile_id: number | null;

  @Column({ type: 'json', nullable: true })
  meta_json: any | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
