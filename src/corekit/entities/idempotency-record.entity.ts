import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn } from 'typeorm';

/**
 * Idempotency record entity
 * Table: core.idempotency (from corekit.v1.yaml)
 */
@Entity('idempotency', { schema: 'core' })
@Index(['scope', 'idempotency_key'], { unique: true })
export class IdempotencyRecord {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 120 })
  scope: string;

  @Column({ type: 'varchar', length: 120 })
  idempotency_key: string;

  @Column({ type: 'varchar', length: 255 })
  fingerprint: string;

  @Column({ type: 'varchar', length: 20, default: 'in_progress' })
  status: 'in_progress' | 'completed' | 'failed';

  @Column({ type: 'int', nullable: true })
  http_status?: number;

  @Column({ type: 'json', nullable: true })
  response_body?: any;

  @CreateDateColumn()
  claimed_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  completed_at?: Date;

  @Column({ type: 'int', nullable: true })
  ttl_seconds?: number;
}
