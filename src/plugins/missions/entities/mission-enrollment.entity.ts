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
import { Mission } from './mission.entity';

/**
 * Mission enrollment entity - user participation in a mission
 * Based on mission.pillar.yml aggregate 'enrollment'
 * Table: missions.mission_enrollment
 */
@Entity('mission_enrollment', { schema: 'missions' })
@Index(['mission_id', 'participant_user_id'], { unique: true })
@Index(['participant_user_id', 'status'])
export class MissionEnrollment {
  @PrimaryColumn('uuid')
  enrollment_id: string;

  @Column('uuid')
  mission_id: string;

  @Column({ type: 'varchar', length: 120 })
  participant_user_id: string;

  @Column({ type: 'varchar', length: 16, default: 'ENROLLED' })
  status: 'ENROLLED' | 'SUBMITTED' | 'COMPLETED' | 'CANCELLED';

  @Column({ type: 'timestamp' })
  enrolled_at: Date;

  @Column({ type: 'uuid', nullable: true })
  last_submission_id?: string;

  @Column({ type: 'timestamp', nullable: true })
  completed_at?: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => Mission)
  @JoinColumn({ name: 'mission_id' })
  mission: Mission;
}
