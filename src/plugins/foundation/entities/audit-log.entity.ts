import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * AuditLog Entity
 * Append-only system audit trail. Records all significant actor actions on resources.
 * Based on specs/foundation/foundation.pillar.v2.yml
 */
@Entity('audit_log')
@Index('idx_audit_time', ['occurred_at'])
@Index('idx_audit_actor', ['actor_type', 'actor_id'])
@Index('idx_audit_resource', ['resource_type', 'resource_id'])
@Index('idx_audit_request', ['request_id'])
@Index('idx_audit_action_result', ['action', 'result'])
export class AuditLog {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 32, name: 'actor_type' })
  actor_type: string;

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'actor_id' })
  actor_id: string | null;

  @Column({ type: 'varchar', length: 64, name: 'action' })
  action: string;

  @Column({ type: 'varchar', length: 64, name: 'resource_type' })
  resource_type: string;

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'resource_id' })
  resource_id: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'request_id' })
  request_id: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'ip' })
  ip: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true, name: 'user_agent' })
  user_agent: string | null;

  @Column({ type: 'varchar', length: 16, default: 'success', name: 'result' })
  result: string;

  @Column({ type: 'json', nullable: true, name: 'before_json' })
  before_json: any;

  @Column({ type: 'json', nullable: true, name: 'after_json' })
  after_json: any;

  @Column({ type: 'json', nullable: true, name: 'meta_json' })
  meta_json: any;

  @Column({ type: 'datetime', name: 'occurred_at' })
  occurred_at: Date;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  created_at: Date;
}
