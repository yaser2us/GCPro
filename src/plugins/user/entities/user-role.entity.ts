import { Entity, Column, CreateDateColumn, PrimaryColumn } from 'typeorm';

/**
 * UserRole Entity
 * Source: specs/user/user.pillar.v2.yml
 *
 * User-role assignments
 */
@Entity('user_role')
export class UserRole {
  @PrimaryColumn({ type: 'bigint', unsigned: true })
  user_id: number;

  @PrimaryColumn({ type: 'bigint', unsigned: true })
  role_id: number;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
