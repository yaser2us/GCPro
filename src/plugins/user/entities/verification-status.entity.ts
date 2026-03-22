import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * VerificationStatus Entity
 * Maps to: verification_status table
 * Source: specs/user-identity/user-identity.pillar.v2.yml
 *
 * Purpose: Per-account verification state per type (email, phone, kyc, id_document).
 * One row per (account_id, type); upserted on each status change.
 */
@Entity('verification_status')
@Index('uk_verification_account_type', ['account_id', 'type'], { unique: true })
@Index('idx_verification_status', ['type', 'status'])
export class VerificationStatus {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  account_id: number;

  @Column({ type: 'varchar', length: 32 })
  type: string;

  @Column({ type: 'varchar', length: 32 })
  status: string;

  @Column({ type: 'json', nullable: true })
  meta_json: any | null;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
