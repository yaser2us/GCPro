import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * MedicalProvider Entity
 * Maps to: medical_provider table
 * Source: specs/claim/claim.pillar.v2.yml lines 855-913
 *
 * Purpose: Panel hospitals and clinics
 */
@Entity('medical_provider')
@Index('uk_provider_code', ['provider_code'], { unique: true })
@Index('idx_provider_status', ['panel_status'])
export class MedicalProvider {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 64 })
  provider_code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 16, default: 'hospital' })
  type: string;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  panel_status: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  contact_phone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contact_email: string | null;

  @Column({ type: 'json', nullable: true })
  meta_json: any | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
