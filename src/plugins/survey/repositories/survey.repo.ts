import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { Survey } from '../entities/survey.entity';

/**
 * SurveyRepository
 * Handles database operations for survey table
 * Source: specs/survey/survey.pillar.v2.yml
 */
@Injectable()
export class SurveyRepository {
  constructor(
    @InjectRepository(Survey)
    private readonly repo: Repository<Survey>,
  ) {}

  /**
   * Find survey by ID
   */
  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<Survey | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(Survey, { where: { id } });
  }

  /**
   * Find survey by code
   */
  async findByCode(
    code: string,
    queryRunner?: QueryRunner,
  ): Promise<Survey | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(Survey, { where: { code } });
  }

  /**
   * Create survey
   * Returns the inserted ID (auto-increment)
   */
  async create(
    data: Partial<Survey>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(Survey, data);
    return result.identifiers[0].id;
  }

  /**
   * Update survey by ID
   */
  async update(
    id: number,
    data: Partial<Survey>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(Survey, { id }, data);
  }

  /**
   * Upsert survey by code (idempotent create)
   * Based on survey.pillar.v2.yml upsert pattern
   */
  async upsert(
    data: Partial<Survey>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    const fields = Object.keys(data).filter((k) => k !== 'id');
    const values = fields.map((k) => data[k]);

    const fieldList = fields.join(', ');
    const placeholders = fields.map(() => '?').join(', ');
    const updateList = fields
      .filter((f) => f !== 'code')
      .map((f) => `${f} = VALUES(${f})`)
      .join(', ');

    const query = `
      INSERT INTO survey (${fieldList})
      VALUES (${placeholders})
      ON DUPLICATE KEY UPDATE
        ${updateList},
        id = LAST_INSERT_ID(id)
    `;

    const result = await manager.query(query, values);
    return result.insertId;
  }

  /**
   * List all surveys
   */
  async findAll(queryRunner?: QueryRunner): Promise<Survey[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(Survey, {
      order: { created_at: 'DESC' },
    });
  }
}
