import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * OnboardingProgress Entity
 * Maps to: onboarding_progress table
 * Source: specs/user-identity/user-identity.pillar.v2.yml
 *
 * Purpose: Step-by-step onboarding tracker per user.
 * One row per (user_id, step_code); upserted as each step changes state.
 */
@Entity('onboarding_progress')
@Index('uk_onboarding_user_step', ['user_id', 'step_code'], { unique: true })
@Index('idx_onboarding_user_state', ['user_id', 'state'])
export class OnboardingProgress {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  user_id: number;

  @Column({ type: 'varchar', length: 64 })
  step_code: string;

  @Column({ type: 'varchar', length: 16 })
  state: string;

  @Column({ type: 'json', nullable: true })
  meta_json: any | null;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
