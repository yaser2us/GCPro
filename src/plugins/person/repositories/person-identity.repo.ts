import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { PersonIdentity } from '../entities/person-identity.entity';

/**
 * PersonIdentityRepository
 * Handles database operations for person_identity table
 * Source: specs/person/person.pillar.v2.yml
 */
@Injectable()
export class PersonIdentityRepository {
  constructor(
    @InjectRepository(PersonIdentity)
    private readonly repo: Repository<PersonIdentity>,
  ) {}

  /**
   * Find person identities by person_id
   */
  async findByPersonId(
    personId: number,
    queryRunner?: QueryRunner,
  ): Promise<PersonIdentity[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(PersonIdentity, {
      where: { person_id: personId },
      order: { created_at: 'ASC' },
    });
  }

  /**
   * Upsert person identity (idempotent via UNIQUE(id_type, id_no))
   */
  async upsert(
    data: Partial<PersonIdentity>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    const fields = Object.keys(data).filter((k) => k !== 'id');
    const values = fields.map((k) => data[k]);

    const fieldList = fields.join(', ');
    const placeholders = fields.map(() => '?').join(', ');

    const query = `
      INSERT INTO person_identity (${fieldList})
      VALUES (${placeholders})
      ON DUPLICATE KEY UPDATE
        id = LAST_INSERT_ID(id)
    `;

    const result = await manager.query(query, values);
    return result.insertId;
  }
}
