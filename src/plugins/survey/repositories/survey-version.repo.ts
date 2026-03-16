import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { SurveyVersion } from '../entities/survey-version.entity';

/**
 * SurveyVersionRepository
 * Handles database operations for survey_version table
 * Source: specs/survey/survey.pillar.v2.yml
 */
@Injectable()
export class SurveyVersionRepository {
  constructor(
    @InjectRepository(SurveyVersion)
    private readonly repo: Repository<SurveyVersion>,
  ) {}

  /**
   * Find survey version by ID
   */
  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<SurveyVersion | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(SurveyVersion, { where: { id } });
  }

  /**
   * Find survey versions by survey ID
   */
  async findBySurveyId(
    surveyId: number,
    queryRunner?: QueryRunner,
  ): Promise<SurveyVersion[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(SurveyVersion, {
      where: { survey_id: surveyId },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Create survey version
   * Returns the inserted ID (auto-increment)
   */
  async create(
    data: Partial<SurveyVersion>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(SurveyVersion, data);
    return result.identifiers[0].id;
  }

  /**
   * Update survey version by ID
   */
  async update(
    id: number,
    data: Partial<SurveyVersion>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(SurveyVersion, { id }, data);
  }

  /**
   * Upsert survey version by survey_id and version
   */
  async upsert(
    data: Partial<SurveyVersion>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    const fields = Object.keys(data).filter((k) => k !== 'id');
    const values = fields.map((k) => {
      const value = data[k];
      if ((k === 'schema_json' || k === 'logic_json' || k === 'meta_json') && value !== null && value !== undefined) {
        return JSON.stringify(value);
      }
      return value;
    });

    const fieldList = fields.join(', ');
    const placeholders = fields.map(() => '?').join(', ');
    const updateList = fields
      .filter((f) => f !== 'survey_id' && f !== 'version')
      .map((f) => `${f} = VALUES(${f})`)
      .join(', ');

    const query = `
      INSERT INTO survey_version (${fieldList})
      VALUES (${placeholders})
      ON DUPLICATE KEY UPDATE
        ${updateList},
        id = LAST_INSERT_ID(id)
    `;

    const result = await manager.query(query, values);
    return result.insertId;
  }
}
