import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * GuidelineAcceptance Entity
 * Records that a user/account/person has accepted a specific guideline version.
 * Based on specs/foundation/foundation.pillar.v2.yml
 */
@Entity('guideline_acceptance')
@Index('uk_guideline_accept_idem', ['idempotency_key'], { unique: true })
@Index('uk_guideline_accept_once', ['version_id', 'account_id', 'person_id', 'user_id'], { unique: true })
@Index('idx_guideline_accept_version', ['version_id', 'accepted_at'])
@Index('idx_guideline_accept_account', ['account_id', 'accepted_at'])
@Index('idx_guideline_accept_person', ['person_id', 'accepted_at'])
@Index('idx_guideline_accept_user', ['user_id', 'accepted_at'])
@Index('idx_guideline_accept_status', ['acceptance_status'])
export class GuidelineAcceptance {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true, name: 'version_id' })
  version_id: number;

  @Column({ type: 'bigint', unsigned: true, nullable: true, name: 'account_id' })
  account_id: number | null;

  @Column({ type: 'bigint', unsigned: true, nullable: true, name: 'person_id' })
  person_id: number | null;

  @Column({ type: 'bigint', unsigned: true, nullable: true, name: 'user_id' })
  user_id: number | null;

  @Column({ type: 'varchar', length: 16, default: 'accepted', name: 'acceptance_status' })
  acceptance_status: string;

  @Column({ type: 'varchar', length: 16, default: 'app', name: 'channel' })
  channel: string;

  @Column({ type: 'varchar', length: 32, default: 'other', name: 'source' })
  source: string;

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'request_id' })
  request_id: string | null;

  @Column({ type: 'varchar', length: 128, name: 'idempotency_key' })
  idempotency_key: string;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'ip' })
  ip: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true, name: 'user_agent' })
  user_agent: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', name: 'accepted_at' })
  accepted_at: Date;

  @Column({ type: 'json', nullable: true, name: 'meta_json' })
  meta_json: any;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  created_at: Date;
}
