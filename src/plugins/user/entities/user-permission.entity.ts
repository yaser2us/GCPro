import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

/**
 * UserPermission Entity
 * Source: specs/user/user.pillar.v2.yml
 *
 * User-specific permission overrides
 */
@Entity('user_permission')
export class UserPermission {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  user_id: number;

  @Column({ type: 'bigint', unsigned: true })
  permission_id: number;

  @Column({ type: 'varchar', length: 16, default: 'allow' })
  effect: 'allow' | 'deny';

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
