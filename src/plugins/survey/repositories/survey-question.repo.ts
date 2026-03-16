import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { SurveyQuestion } from '../entities/survey-question.entity';

/**
 * SurveyQuestionRepository
 * Handles database operations for survey_question table
 * Source: specs/survey/survey.pillar.v2.yml
 */
@Injectable()
export class SurveyQuestionRepository {
  constructor(
    @InjectRepository(SurveyQuestion)
    private readonly repo: Repository<SurveyQuestion>,
  ) {}

  /**
   * Find survey question by ID
   */
  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<SurveyQuestion | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(SurveyQuestion, { where: { id } });
  }

  /**
   * Find survey questions by version ID
   */
  async findByVersionId(
    versionId: number,
    queryRunner?: QueryRunner,
  ): Promise<SurveyQuestion[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(SurveyQuestion, {
      where: { survey_version_id: versionId },
      order: { sort_order: 'ASC' },
    });
  }

  /**
   * Bulk insert survey questions
   */
  async bulkInsert(
    questions: Partial<SurveyQuestion>[],
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.insert(SurveyQuestion, questions);
  }
}
