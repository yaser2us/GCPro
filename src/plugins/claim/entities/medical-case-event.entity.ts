import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * MedicalCaseEvent Entity
 * Maps to: medical_case_event table
 * Source: specs/claim/claim.pillar.v2.yml lines 797-853
 *
 * Purpose: Medical case event log
 */
@Entity('medical_case_event')
@Index('idx_mce_case_time', ['medical_case_id', 'occurred_at'])
export class MedicalCaseEvent {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  medical_case_id: number;

  @Column({ type: 'varchar', length: 64 })
  event_type: string;

  @Column({ type: 'varchar', length: 16, default: 'system' })
  actor_type: string;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  actor_id: number | null;

  @Column({ type: 'json', nullable: true })
  payload_json: any | null;

  @Column({ type: 'datetime' })
  occurred_at: Date;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
