import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * ReferralProgram Entity
 * Maps to: referral_program table
 * Source: specs/referral/referral.pillar.yml lines 63-122
 *
 * Purpose: Referral program configuration and settings
 */
@Entity('referral_program')
export class ReferralProgram {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 64, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: 'active' | 'paused' | 'retired';

  @Column({ type: 'datetime', nullable: true })
  start_at: Date | null;

  @Column({ type: 'datetime', nullable: true })
  end_at: Date | null;

  @Column({ type: 'json', nullable: true })
  eligibility_json: any | null;

  @Column({ type: 'json', nullable: true })
  meta_json: any | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
