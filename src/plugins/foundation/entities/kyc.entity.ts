import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * KYC Entity
 * KYC verification record. Polymorphic via subject_type + subject_id.
 * Based on specs/foundation/foundation.pillar.v2.yml
 */
@Entity('kyc')
@Index('idx_kyc_subject', ['subject_type', 'subject_id'])
@Index('idx_kyc_status', ['status', 'verified_at'])
export class KYC {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 16, name: 'subject_type' })
  subject_type: string;

  @Column({ type: 'bigint', unsigned: true, name: 'subject_id' })
  subject_id: number;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'provider' })
  provider: string | null;

  @Column({ type: 'varchar', length: 32, name: 'status' })
  status: string;

  @Column({ type: 'datetime', nullable: true, name: 'verified_at' })
  verified_at: Date | null;

  @Column({ type: 'json', nullable: true, name: 'meta_json' })
  meta_json: any;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  created_at: Date;

  @Column({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
    name: 'updated_at',
  })
  updated_at: Date;
}
