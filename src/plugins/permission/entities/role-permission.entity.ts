import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

/**
 * RolePermission Entity
 * Maps to: role_permission table
 * Source: specs/permission/permission.pillar.v2.yml
 *
 * Purpose: Role-Permission assignments (junction table)
 */
@Entity('role_permission')
export class RolePermission {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  role_id: number;

  @Column({ type: 'bigint', unsigned: true })
  permission_id: number;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
