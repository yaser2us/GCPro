import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

/**
 * Permission Entity
 * Maps to: permission table
 * Source: specs/permission/permission.pillar.v2.yml
 *
 * Purpose: Permission definitions for RBAC system
 */
@Entity('permission')
export class Permission {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 128, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 32, default: 'api' })
  scope: string;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: 'active' | 'inactive';

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
