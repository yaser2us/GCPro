import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

/**
 * UserCredential Entity
 * Source: specs/user/user.pillar.v2.yml
 *
 * User authentication credentials (passwords, OAuth tokens, etc.)
 */
@Entity('user_credential')
export class UserCredential {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  user_id: number;

  @Column({ type: 'varchar', length: 32 })
  type: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  secret_hash: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  provider_ref: string | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
