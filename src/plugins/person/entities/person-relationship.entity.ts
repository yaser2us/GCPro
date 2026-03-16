import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

/**
 * PersonRelationship Entity
 * Source: specs/person/person.pillar.v2.yml
 *
 * Relationships between persons (family, dependent, etc.)
 */
@Entity('person_relationship')
export class PersonRelationship {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  from_person_id: number;

  @Column({ type: 'bigint', unsigned: true })
  to_person_id: number;

  @Column({ type: 'varchar', length: 32 })
  relation_type: string;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
