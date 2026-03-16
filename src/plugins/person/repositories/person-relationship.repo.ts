import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { PersonRelationship } from '../entities/person-relationship.entity';

/**
 * PersonRelationshipRepository
 * Handles database operations for person_relationship table
 * Source: specs/person/person.pillar.v2.yml
 */
@Injectable()
export class PersonRelationshipRepository {
  constructor(
    @InjectRepository(PersonRelationship)
    private readonly repo: Repository<PersonRelationship>,
  ) {}

  /**
   * Find relationships for a person
   */
  async findByPersonId(
    personId: number,
    queryRunner?: QueryRunner,
  ): Promise<PersonRelationship[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    const query = `
      SELECT *
      FROM person_relationship
      WHERE from_person_id = ? OR to_person_id = ?
      ORDER BY created_at ASC
    `;

    return manager.query(query, [personId, personId]);
  }

  /**
   * Upsert person relationship (idempotent via UNIQUE(from_person_id, to_person_id, relation_type))
   */
  async upsert(
    data: Partial<PersonRelationship>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    const fields = Object.keys(data).filter((k) => k !== 'id');
    const values = fields.map((k) => data[k]);

    const fieldList = fields.join(', ');
    const placeholders = fields.map(() => '?').join(', ');

    const query = `
      INSERT INTO person_relationship (${fieldList})
      VALUES (${placeholders})
      ON DUPLICATE KEY UPDATE
        id = LAST_INSERT_ID(id)
    `;

    const result = await manager.query(query, values);
    return result.insertId;
  }
}
