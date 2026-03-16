import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

/**
 * PersonIdentity Entity
 * Source: specs/person/person.pillar.v2.yml
 *
 * Identity documents for persons (passport, IC, NRIC, etc.)
 */
@Entity('person_identity')
export class PersonIdentity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  person_id: number;

  @Column({ type: 'varchar', length: 32 })
  id_type: string;

  @Column({ type: 'varchar', length: 64 })
  id_no: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  country: string | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
