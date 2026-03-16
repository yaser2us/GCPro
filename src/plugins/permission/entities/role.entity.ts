import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

/**
 * Role Entity
 * Maps to: role table
 * Source: specs/permission/permission.pillar.v2.yml
 *
 * Purpose: Role definitions for RBAC system
 */
@Entity('role')
export class Role {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 64, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
