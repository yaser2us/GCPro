import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Survey } from './entities/survey.entity';
import { SurveyVersion } from './entities/survey-version.entity';
import { SurveyQuestion } from './entities/survey-question.entity';
import { SurveyQuestionOption } from './entities/survey-question-option.entity';
import { SurveyResponse } from './entities/survey-response.entity';
import { SurveyResponseFile } from './entities/survey-response-file.entity';
import { SurveyAnswer } from './entities/survey-answer.entity';
import { SurveyRepository } from './repositories/survey.repo';
import { SurveyVersionRepository } from './repositories/survey-version.repo';
import { SurveyQuestionRepository } from './repositories/survey-question.repo';
import { SurveyQuestionOptionRepository } from './repositories/survey-question-option.repo';
import { SurveyResponseRepository } from './repositories/survey-response.repo';
import { SurveyResponseFileRepository } from './repositories/survey-response-file.repo';
import { SurveyAnswerRepository } from './repositories/survey-answer.repo';
import { SurveyWorkflowService } from './services/survey.workflow.service';
import { SurveyController } from './controllers/survey.controller';

/**
 * Survey Module
 * Encapsulates all survey-related functionality
 *
 * Based on specs/survey/survey.pillar.v2.yml
 */
@Module({
  imports: [
    // Register Survey entities with TypeORM
    TypeOrmModule.forFeature([
      Survey,
      SurveyVersion,
      SurveyQuestion,
      SurveyQuestionOption,
      SurveyResponse,
      SurveyResponseFile,
      SurveyAnswer,
    ]),
  ],
  controllers: [
    // HTTP controllers
    SurveyController,
  ],
  providers: [
    // Repositories (data access)
    SurveyRepository,
    SurveyVersionRepository,
    SurveyQuestionRepository,
    SurveyQuestionOptionRepository,
    SurveyResponseRepository,
    SurveyResponseFileRepository,
    SurveyAnswerRepository,
    // Services (business logic)
    SurveyWorkflowService,
  ],
  exports: [
    // Export services in case other modules need them
    SurveyWorkflowService,
  ],
})
export class SurveyModule {}
