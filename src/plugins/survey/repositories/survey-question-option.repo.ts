import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { SurveyQuestionOption } from '../entities/survey-question-option.entity';

/**
 * SurveyQuestionOptionRepository
 * Handles database operations for survey_question_option table
 * Source: specs/survey/survey.pillar.v2.yml
 */
@Injectable()
export class SurveyQuestionOptionRepository {
  constructor(
    @InjectRepository(SurveyQuestionOption)
    private readonly repo: Repository<SurveyQuestionOption>,
  ) {}

  /**
   * Find survey question options by question ID
   */
  async findByQuestionId(
    questionId: number,
    queryRunner?: QueryRunner,
  ): Promise<SurveyQuestionOption[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(SurveyQuestionOption, {
      where: { question_id: questionId },
      order: { sort_order: 'ASC' },
    });
  }

  /**
   * Bulk insert survey question options
   */
  async bulkInsert(
    options: Partial<SurveyQuestionOption>[],
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.insert(SurveyQuestionOption, options);
  }
}
