import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { SurveyResponse } from '../entities/survey-response.entity';

/**
 * SurveyResponseRepository
 * Handles database operations for survey_response table
 * Source: specs/survey/survey.pillar.v2.yml
 */
@Injectable()
export class SurveyResponseRepository {
  constructor(
    @InjectRepository(SurveyResponse)
    private readonly repo: Repository<SurveyResponse>,
  ) {}

  /**
   * Find survey response by ID
   */
  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<SurveyResponse | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(SurveyResponse, { where: { id } });
  }

  /**
   * Create survey response
   * Returns the inserted ID (auto-increment)
   */
  async create(
    data: Partial<SurveyResponse>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(SurveyResponse, data);
    return result.identifiers[0].id;
  }

  /**
   * Update survey response by ID
   */
  async update(
    id: number,
    data: Partial<SurveyResponse>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(SurveyResponse, { id }, data);
  }

  /**
   * List all survey responses
   */
  async findAll(queryRunner?: QueryRunner): Promise<SurveyResponse[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(SurveyResponse, {
      order: { created_at: 'DESC' },
    });
  }
}
