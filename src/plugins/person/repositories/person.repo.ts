import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { Person } from '../entities/person.entity';

/**
 * PersonRepository
 * Handles database operations for person table
 * Source: specs/person/person.pillar.v2.yml
 */
@Injectable()
export class PersonRepository {
  constructor(
    @InjectRepository(Person)
    private readonly repo: Repository<Person>,
  ) {}

  /**
   * Find person by ID
   */
  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<Person | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(Person, { where: { id } });
  }

  /**
   * Create person
   * Returns the inserted ID (auto-increment)
   */
  async create(
    data: Partial<Person>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(Person, data);
    return result.identifiers[0].id;
  }

  /**
   * Update person by ID
   */
  async update(
    id: number,
    data: Partial<Person>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(Person, { id }, data);
  }

  /**
   * List all persons
   */
  async findAll(queryRunner?: QueryRunner): Promise<Person[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(Person, {
      order: { created_at: 'DESC' },
    });
  }
}
