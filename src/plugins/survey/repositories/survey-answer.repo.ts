import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { SurveyAnswer } from '../entities/survey-answer.entity';

/**
 * SurveyAnswerRepository
 * Handles database operations for survey_answer table
 * Source: specs/survey/survey.pillar.v2.yml
 */
@Injectable()
export class SurveyAnswerRepository {
  constructor(
    @InjectRepository(SurveyAnswer)
    private readonly repo: Repository<SurveyAnswer>,
  ) {}

  /**
   * Find survey answer by ID
   */
  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<SurveyAnswer | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(SurveyAnswer, { where: { id } });
  }

  /**
   * Find survey answers by response ID
   */
  async findByResponseId(
    responseId: number,
    queryRunner?: QueryRunner,
  ): Promise<SurveyAnswer[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(SurveyAnswer, {
      where: { response_id: responseId },
    });
  }

  /**
   * Upsert survey answer by response_id and question_id
   */
  async upsert(
    data: Partial<SurveyAnswer>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    const fields = Object.keys(data).filter((k) => k !== 'id');
    const values = fields.map((k) => {
      const value = data[k];
      if (k === 'value_json' && value !== null && value !== undefined) {
        return JSON.stringify(value);
      }
      return value;
    });

    const fieldList = fields.join(', ');
    const placeholders = fields.map(() => '?').join(', ');
    const updateList = fields
      .filter((f) => f !== 'response_id' && f !== 'question_id')
      .map((f) => `${f} = VALUES(${f})`)
      .join(', ');

    const query = `
      INSERT INTO survey_answer (${fieldList})
      VALUES (${placeholders})
      ON DUPLICATE KEY UPDATE
        ${updateList},
        id = LAST_INSERT_ID(id)
    `;

    const result = await manager.query(query, values);
    return result.insertId;
  }
}
