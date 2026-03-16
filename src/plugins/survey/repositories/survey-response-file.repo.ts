import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { SurveyResponseFile } from '../entities/survey-response-file.entity';

/**
 * SurveyResponseFileRepository
 * Handles database operations for survey_response_file table
 * Source: specs/survey/survey.pillar.v2.yml
 */
@Injectable()
export class SurveyResponseFileRepository {
  constructor(
    @InjectRepository(SurveyResponseFile)
    private readonly repo: Repository<SurveyResponseFile>,
  ) {}

  /**
   * Find survey response files by response ID
   */
  async findByResponseId(
    responseId: number,
    queryRunner?: QueryRunner,
  ): Promise<SurveyResponseFile[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(SurveyResponseFile, {
      where: { response_id: responseId },
      order: { sort_order: 'ASC' },
    });
  }

  /**
   * Upsert survey response file
   */
  async upsert(
    data: Partial<SurveyResponseFile>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    const fields = Object.keys(data).filter((k) => k !== 'id');
    const values = fields.map((k) => {
      const value = data[k];
      if (k === 'meta_json' && value !== null && value !== undefined) {
        return JSON.stringify(value);
      }
      return value;
    });

    const fieldList = fields.join(', ');
    const placeholders = fields.map(() => '?').join(', ');
    const updateList = fields
      .filter((f) => f !== 'response_id' && f !== 'file_upload_id')
      .map((f) => `${f} = VALUES(${f})`)
      .join(', ');

    const query = `
      INSERT INTO survey_response_file (${fieldList})
      VALUES (${placeholders})
      ON DUPLICATE KEY UPDATE
        ${updateList},
        id = LAST_INSERT_ID(id)
    `;

    const result = await manager.query(query, values);
    return result.insertId;
  }
}
