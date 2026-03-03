import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MissionEnrollment } from './mission-enrollment.entity';

/**
 * Mission submission entity - proof submitted by user
 * Based on mission.pillar.yml aggregate 'submission'
 * Table: missions.mission_submission
 */
@Entity('mission_submission', { schema: 'missions' })
@Index(['mission_id', 'enrollment_id'])
@Index(['participant_user_id'])
@Index(['status'])
export class MissionSubmission {
  @PrimaryColumn('uuid')
  submission_id: string;

  @Column('uuid')
  mission_id: string;

  @Column('uuid')
  enrollment_id: string;

  @Column({ type: 'varchar', length: 120 })
  participant_user_id: string;

  @Column({ type: 'varchar', length: 16, default: 'PENDING' })
  status: 'PENDING' | 'APPROVED' | 'REJECTED';

  @Column({ type: 'varchar', length: 32 })
  proof_type: string; // TEXT, IMAGE, URL, etc.

  @Column({ type: 'json' })
  proof_payload_json: any;

  @Column({ type: 'timestamp' })
  submitted_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  approved_at?: Date;

  @Column({ type: 'varchar', length: 120, nullable: true })
  approved_by_user_id?: string;

  @Column({ type: 'text', nullable: true })
  approval_note?: string;

  @Column({ type: 'timestamp', nullable: true })
  rejected_at?: Date;

  @Column({ type: 'varchar', length: 120, nullable: true })
  rejected_by_user_id?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  rejection_reason?: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => MissionEnrollment)
  @JoinColumn({ name: 'enrollment_id' })
  enrollment: MissionEnrollment;
}
