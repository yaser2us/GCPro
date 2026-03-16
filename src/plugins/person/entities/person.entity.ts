import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Person Entity
 * Source: specs/person/person.pillar.v2.yml
 *
 * Represents an individual person in the system
 */
@Entity('person')
export class Person {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  primary_user_id: number | null;

  @Column({ type: 'varchar', length: 16 })
  type: string;

  @Column({ type: 'varchar', length: 255 })
  full_name: string;

  @Column({ type: 'date', nullable: true })
  dob: Date | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  gender: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  nationality: string | null;

  @Column({ type: 'varchar', length: 32, default: 'active' })
  status: 'active' | 'inactive' | 'deceased';

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
