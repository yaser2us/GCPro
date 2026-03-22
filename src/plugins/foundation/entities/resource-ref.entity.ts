import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * ResourceRef Entity
 * UUID registry for internal resources. Maps resource_type + resource_id to a stable UUID.
 * Based on specs/foundation/foundation.pillar.v2.yml
 */
@Entity('resource_ref')
@Index('uk_resource_type_id', ['resource_type', 'resource_id'], { unique: true })
@Index('uk_resource_uuid', ['resource_uuid'], { unique: true })
@Index('idx_resource_type_status', ['resource_type', 'status'])
export class ResourceRef {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 64, name: 'resource_type' })
  resource_type: string;

  @Column({ type: 'bigint', unsigned: true, name: 'resource_id' })
  resource_id: number;

  @Column({ type: 'char', length: 36, nullable: true, name: 'resource_uuid' })
  resource_uuid: string | null;

  @Column({ type: 'varchar', length: 16, default: 'active', name: 'status' })
  status: string;

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
