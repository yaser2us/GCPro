import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

/**
 * MissionRewardGrant Entity
 * Maps to: mission_reward_grant table
 * Source: docs/database/mission-DDL.md
 *
 * Purpose: Reward issuance tracking (idempotent via idempotency_key and unique constraint)
 */
@Entity('mission_reward_grant')
export class MissionRewardGrant {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true, unique: true })
  assignment_id: number;

  @Column({ type: 'bigint', unsigned: true })
  user_id: number;

  @Column({ type: 'varchar', length: 16, default: 'coins' })
  reward_type: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 16, default: 'COIN' })
  currency: string;

  @Column({ type: 'varchar', length: 16, default: 'granted' })
  status: 'created' | 'requested' | 'granted' | 'failed' | 'revoked';

  @Column({ type: 'varchar', length: 64, nullable: true })
  ref_type: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  ref_id: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true, unique: true })
  idempotency_key: string | null;

  @Column({ type: 'json', nullable: true })
  meta_json: any | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  granted_at: Date;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
