import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { OutboxService } from '../../../corekit/services/outbox.service';
import { SurveyRepository } from '../repositories/survey.repo';
import { SurveyVersionRepository } from '../repositories/survey-version.repo';
import { SurveyQuestionRepository } from '../repositories/survey-question.repo';
import { SurveyQuestionOptionRepository } from '../repositories/survey-question-option.repo';
import { SurveyResponseRepository } from '../repositories/survey-response.repo';
import { SurveyResponseFileRepository } from '../repositories/survey-response-file.repo';
import { SurveyAnswerRepository } from '../repositories/survey-answer.repo';
import { SurveyCreateRequestDto } from '../dto/survey-create.request.dto';
import { SurveyVersionCreateRequestDto } from '../dto/survey-version-create.request.dto';
import { SurveyQuestionBulkCreateRequestDto } from '../dto/survey-question-bulk-create.request.dto';
import { SurveyQuestionOptionBulkCreateRequestDto } from '../dto/survey-question-option-bulk-create.request.dto';
import { SurveyResponseCreateRequestDto } from '../dto/survey-response-create.request.dto';
import { SurveyResponseSubmitRequestDto } from '../dto/survey-response-submit.request.dto';
import { SurveyAnswerUpsertRequestDto } from '../dto/survey-answer-upsert.request.dto';
import { SurveyResponseFileAttachRequestDto } from '../dto/survey-response-file-attach.request.dto';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * Survey Workflow Service
 * Implements survey commands following the workflow discipline:
 * Guard → Validate → Write → Emit → Commit
 *
 * Based on specs/survey/survey.pillar.v2.yml
 */
@Injectable()
export class SurveyWorkflowService {
  constructor(
    private readonly txService: TransactionService,
    private readonly outboxService: OutboxService,
    private readonly surveyRepo: SurveyRepository,
    private readonly versionRepo: SurveyVersionRepository,
    private readonly questionRepo: SurveyQuestionRepository,
    private readonly optionRepo: SurveyQuestionOptionRepository,
    private readonly responseRepo: SurveyResponseRepository,
    private readonly responseFileRepo: SurveyResponseFileRepository,
    private readonly answerRepo: SurveyAnswerRepository,
  ) {}

  /**
   * SURVEY.CREATE COMMAND
   * Source: specs/survey/survey.pillar.v2.yml
   *
   * HTTP: POST /v1/surveys
   * Idempotency: Via unique code constraint
   */
  async createSurvey(
    request: SurveyCreateRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: code is required
      if (!request.code || request.code === '') {
        throw new BadRequestException({
          code: 'SURVEY_CODE_REQUIRED',
          message: 'Survey code is required',
        });
      }

      // WRITE: upsert survey by code
      const surveyId = await this.surveyRepo.upsert(
        {
          code: request.code,
          name: request.name,
          description: request.description || null,
          status: 'active',
        },
        queryRunner,
      );

      // EMIT: SURVEY_CREATED event
      await this.outboxService.enqueue(
        {
          event_name: 'SURVEY_CREATED',
          event_version: 1,
          aggregate_type: 'SURVEY',
          aggregate_id: String(surveyId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            survey_id: surveyId,
            code: request.code,
            name: request.name,
          },
        },
        queryRunner,
      );

      return {
        survey_id: surveyId,
        status: 'active',
      };
    });

    return result;
  }

  /**
   * SURVEY.GET COMMAND
   * Source: specs/survey/survey.pillar.v2.yml
   *
   * HTTP: GET /v1/surveys/{survey_id}
   */
  async getSurvey(id: number) {
    const survey = await this.surveyRepo.findById(id);

    if (!survey) {
      throw new NotFoundException({
        code: 'SURVEY_NOT_FOUND',
        message: `Survey with id ${id} not found`,
      });
    }

    return survey;
  }

  /**
   * SURVEY.LIST COMMAND
   * Source: specs/survey/survey.pillar.v2.yml
   *
   * HTTP: GET /v1/surveys
   */
  async listSurveys() {
    const surveys = await this.surveyRepo.findAll();
    return { items: surveys };
  }

  /**
   * SURVEY.DEACTIVATE COMMAND
   * Source: specs/survey/survey.pillar.v2.yml
   *
   * HTTP: POST /v1/surveys/{survey_id}/deactivate
   */
  async deactivateSurvey(
    id: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: survey
      const survey = await this.surveyRepo.findById(id, queryRunner);
      if (!survey) {
        throw new NotFoundException({
          code: 'SURVEY_NOT_FOUND',
          message: `Survey with id ${id} not found`,
        });
      }

      // GUARD: status must be active
      if (survey.status !== 'active') {
        throw new ConflictException({
          code: 'SURVEY_NOT_ACTIVE',
          message: `Survey is not active, current status: ${survey.status}`,
        });
      }

      // WRITE: update survey to inactive
      await this.surveyRepo.update(
        id,
        { status: 'inactive' },
        queryRunner,
      );

      // EMIT: SURVEY_DEACTIVATED event
      await this.outboxService.enqueue(
        {
          event_name: 'SURVEY_DEACTIVATED',
          event_version: 1,
          aggregate_type: 'SURVEY',
          aggregate_id: String(id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            survey_id: id,
          },
        },
        queryRunner,
      );

      return {
        survey_id: id,
        status: 'inactive',
      };
    });

    return result;
  }

  /**
   * SURVEY_VERSION.CREATE COMMAND
   * Source: specs/survey/survey.pillar.v2.yml
   *
   * HTTP: POST /v1/surveys/{survey_id}/versions
   */
  async createSurveyVersion(
    request: SurveyVersionCreateRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: survey exists
      const survey = await this.surveyRepo.findById(
        Number(request.survey_id),
        queryRunner,
      );
      if (!survey) {
        throw new NotFoundException({
          code: 'SURVEY_NOT_FOUND',
          message: `Survey with id ${request.survey_id} not found`,
        });
      }

      // WRITE: upsert survey version
      const versionId = await this.versionRepo.upsert(
        {
          survey_id: Number(request.survey_id),
          version: request.version,
          schema_json: request.schema_json || null,
          logic_json: request.logic_json || null,
          meta_json: request.meta_json || null,
          status: 'draft',
        },
        queryRunner,
      );

      // EMIT: SURVEY_VERSION_CREATED event
      await this.outboxService.enqueue(
        {
          event_name: 'SURVEY_VERSION_CREATED',
          event_version: 1,
          aggregate_type: 'SURVEY_VERSION',
          aggregate_id: String(versionId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            survey_version_id: versionId,
            survey_id: request.survey_id,
            version: request.version,
          },
        },
        queryRunner,
      );

      return {
        survey_version_id: versionId,
        status: 'draft',
      };
    });

    return result;
  }

  /**
   * SURVEY_VERSION.GET COMMAND
   * Source: specs/survey/survey.pillar.v2.yml
   *
   * HTTP: GET /v1/survey-versions/{survey_version_id}
   */
  async getSurveyVersion(id: number) {
    const version = await this.versionRepo.findById(id);

    if (!version) {
      throw new NotFoundException({
        code: 'SURVEY_VERSION_NOT_FOUND',
        message: `Survey version with id ${id} not found`,
      });
    }

    return version;
  }

  /**
   * SURVEY_VERSION.LIST_BY_SURVEY COMMAND
   * Source: specs/survey/survey.pillar.v2.yml
   *
   * HTTP: GET /v1/surveys/{survey_id}/versions
   */
  async listSurveyVersionsBySurvey(surveyId: number) {
    const versions = await this.versionRepo.findBySurveyId(surveyId);
    return { items: versions };
  }

  /**
   * SURVEY_VERSION.PUBLISH COMMAND
   * Source: specs/survey/survey.pillar.v2.yml
   *
   * HTTP: POST /v1/survey-versions/{survey_version_id}/publish
   */
  async publishSurveyVersion(
    id: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: survey version
      const version = await this.versionRepo.findById(id, queryRunner);
      if (!version) {
        throw new NotFoundException({
          code: 'SURVEY_VERSION_NOT_FOUND',
          message: `Survey version with id ${id} not found`,
        });
      }

      // GUARD: status must be draft
      if (version.status !== 'draft') {
        throw new ConflictException({
          code: 'SURVEY_VERSION_NOT_DRAFT',
          message: `Survey version is not draft, current status: ${version.status}`,
        });
      }

      // WRITE: update survey version to published
      await this.versionRepo.update(
        id,
        {
          status: 'published',
          published_at: new Date(),
        },
        queryRunner,
      );

      // EMIT: SURVEY_VERSION_PUBLISHED event
      await this.outboxService.enqueue(
        {
          event_name: 'SURVEY_VERSION_PUBLISHED',
          event_version: 1,
          aggregate_type: 'SURVEY_VERSION',
          aggregate_id: String(id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            survey_version_id: id,
          },
        },
        queryRunner,
      );

      return {
        survey_version_id: id,
        status: 'published',
      };
    });

    return result;
  }

  /**
   * SURVEY_QUESTION.CREATE_BULK COMMAND
   * Source: specs/survey/survey.pillar.v2.yml
   *
   * HTTP: POST /v1/survey-versions/{survey_version_id}/questions/bulk
   */
  async createSurveyQuestionsBulk(
    request: SurveyQuestionBulkCreateRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: version exists
      const version = await this.versionRepo.findById(
        Number(request.survey_version_id),
        queryRunner,
      );
      if (!version) {
        throw new NotFoundException({
          code: 'SURVEY_VERSION_NOT_FOUND',
          message: `Survey version with id ${request.survey_version_id} not found`,
        });
      }

      // GUARD: version must be draft
      if (version.status !== 'draft') {
        throw new ConflictException({
          code: 'SURVEY_VERSION_NOT_DRAFT',
          message: `Survey version is not draft, current status: ${version.status}`,
        });
      }

      // WRITE: bulk insert questions
      const questions = request.questions.map((q) => ({
        survey_version_id: Number(request.survey_version_id),
        code: q.code,
        label: q.label,
        help_text: q.help_text || null,
        answer_type: q.answer_type,
        required: q.required ? 1 : 0,
        sort_order: q.sort_order || 0,
        rules_json: q.rules_json || null,
        meta_json: q.meta_json || null,
      }));

      await this.questionRepo.bulkInsert(questions, queryRunner);

      // EMIT: SURVEY_QUESTIONS_CREATED event
      await this.outboxService.enqueue(
        {
          event_name: 'SURVEY_QUESTIONS_CREATED',
          event_version: 1,
          aggregate_type: 'SURVEY_VERSION',
          aggregate_id: request.survey_version_id!,
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            survey_version_id: request.survey_version_id,
            count: request.questions.length,
          },
        },
        queryRunner,
      );

      return {
        created_count: request.questions.length,
      };
    });

    return result;
  }

  /**
   * SURVEY_QUESTION.GET COMMAND
   * Source: specs/survey/survey.pillar.v2.yml
   *
   * HTTP: GET /v1/survey-questions/{question_id}
   */
  async getSurveyQuestion(id: number) {
    const question = await this.questionRepo.findById(id);

    if (!question) {
      throw new NotFoundException({
        code: 'SURVEY_QUESTION_NOT_FOUND',
        message: `Survey question with id ${id} not found`,
      });
    }

    return question;
  }

  /**
   * SURVEY_QUESTION.LIST_BY_VERSION COMMAND
   * Source: specs/survey/survey.pillar.v2.yml
   *
   * HTTP: GET /v1/survey-versions/{survey_version_id}/questions
   */
  async listSurveyQuestionsByVersion(versionId: number) {
    const questions = await this.questionRepo.findByVersionId(versionId);
    return { items: questions };
  }

  /**
   * SURVEY_QUESTION_OPTION.CREATE_BULK COMMAND
   * Source: specs/survey/survey.pillar.v2.yml
   *
   * HTTP: POST /v1/survey-questions/{question_id}/options/bulk
   */
  async createSurveyQuestionOptionsBulk(
    request: SurveyQuestionOptionBulkCreateRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: question exists
      const question = await this.questionRepo.findById(
        Number(request.question_id),
        queryRunner,
      );
      if (!question) {
        throw new NotFoundException({
          code: 'SURVEY_QUESTION_NOT_FOUND',
          message: `Survey question with id ${request.question_id} not found`,
        });
      }

      // WRITE: bulk insert options
      const options = request.options.map((o) => ({
        question_id: Number(request.question_id),
        value: o.value,
        label: o.label,
        sort_order: o.sort_order || 0,
      }));

      await this.optionRepo.bulkInsert(options, queryRunner);

      // EMIT: SURVEY_QUESTION_OPTIONS_CREATED event
      await this.outboxService.enqueue(
        {
          event_name: 'SURVEY_QUESTION_OPTIONS_CREATED',
          event_version: 1,
          aggregate_type: 'SURVEY_VERSION',
          aggregate_id: String(question.survey_version_id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            question_id: request.question_id!,
            count: request.options.length,
          },
        },
        queryRunner,
      );

      return {
        created_count: request.options.length,
      };
    });

    return result;
  }

  /**
   * SURVEY_QUESTION_OPTION.LIST_BY_QUESTION COMMAND
   * Source: specs/survey/survey.pillar.v2.yml
   *
   * HTTP: GET /v1/survey-questions/{question_id}/options
   */
  async listSurveyQuestionOptions(questionId: number) {
    const options = await this.optionRepo.findByQuestionId(questionId);
    return { items: options };
  }

  /**
   * SURVEY_RESPONSE.CREATE COMMAND
   * Source: specs/survey/survey.pillar.v2.yml
   *
   * HTTP: POST /v1/survey-responses
   */
  async createSurveyResponse(
    request: SurveyResponseCreateRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: version exists
      const version = await this.versionRepo.findById(
        Number(request.survey_version_id),
        queryRunner,
      );
      if (!version) {
        throw new NotFoundException({
          code: 'SURVEY_VERSION_NOT_FOUND',
          message: `Survey version with id ${request.survey_version_id} not found`,
        });
      }

      // GUARD: version must be published
      if (version.status !== 'published') {
        throw new ConflictException({
          code: 'SURVEY_VERSION_NOT_PUBLISHED',
          message: `Survey version is not published, current status: ${version.status}`,
        });
      }

      // WRITE: insert survey response
      const responseId = await this.responseRepo.create(
        {
          survey_version_id: Number(request.survey_version_id),
          actor_ref_id: Number(request.actor_ref_id),
          subject_ref_id: Number(request.subject_ref_id),
          created_by_user_id: Number(actor.actor_user_id),
          meta_json: request.meta_json || null,
          status: 'draft',
        },
        queryRunner,
      );

      // EMIT: SURVEY_RESPONSE_CREATED event
      await this.outboxService.enqueue(
        {
          event_name: 'SURVEY_RESPONSE_CREATED',
          event_version: 1,
          aggregate_type: 'SURVEY_RESPONSE',
          aggregate_id: String(responseId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            survey_response_id: responseId,
            survey_version_id: request.survey_version_id,
          },
        },
        queryRunner,
      );

      return {
        survey_response_id: responseId,
        status: 'draft',
      };
    });

    return result;
  }

  /**
   * SURVEY_RESPONSE.GET COMMAND
   * Source: specs/survey/survey.pillar.v2.yml
   *
   * HTTP: GET /v1/survey-responses/{response_id}
   */
  async getSurveyResponse(id: number) {
    const response = await this.responseRepo.findById(id);

    if (!response) {
      throw new NotFoundException({
        code: 'SURVEY_RESPONSE_NOT_FOUND',
        message: `Survey response with id ${id} not found`,
      });
    }

    return response;
  }

  /**
   * SURVEY_RESPONSE.LIST COMMAND
   * Source: specs/survey/survey.pillar.v2.yml
   *
   * HTTP: GET /v1/survey-responses
   */
  async listSurveyResponses() {
    const responses = await this.responseRepo.findAll();
    return { items: responses };
  }

  /**
   * SURVEY_RESPONSE.SUBMIT COMMAND
   * Source: specs/survey/survey.pillar.v2.yml
   *
   * HTTP: POST /v1/survey-responses/{response_id}/submit
   */
  async submitSurveyResponse(
    id: number,
    request: SurveyResponseSubmitRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: survey response
      const response = await this.responseRepo.findById(id, queryRunner);
      if (!response) {
        throw new NotFoundException({
          code: 'SURVEY_RESPONSE_NOT_FOUND',
          message: `Survey response with id ${id} not found`,
        });
      }

      // GUARD: response must be draft
      if (response.status !== 'draft') {
        throw new ConflictException({
          code: 'SURVEY_RESPONSE_NOT_DRAFT',
          message: `Survey response is not draft, current status: ${response.status}`,
        });
      }

      // WRITE: save answers (simplified - just save the answers array)
      // In production, you would validate against question definitions
      for (const answer of request.answers) {
        await this.answerRepo.upsert(
          {
            response_id: id,
            question_id: answer.question_id,
            value_bool: answer.value_bool || null,
            value_text: answer.value_text || null,
            value_num: answer.value_num || null,
            value_date: answer.value_date || null,
            value_json: answer.value_json || null,
          },
          queryRunner,
        );
      }

      // WRITE: update response to submitted
      await this.responseRepo.update(
        id,
        {
          status: 'submitted',
          submitted_at: new Date(),
        },
        queryRunner,
      );

      // EMIT: SURVEY_RESPONSE_SUBMITTED event
      await this.outboxService.enqueue(
        {
          event_name: 'SURVEY_RESPONSE_SUBMITTED',
          event_version: 1,
          aggregate_type: 'SURVEY_RESPONSE',
          aggregate_id: String(id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            survey_response_id: id,
          },
        },
        queryRunner,
      );

      return {
        survey_response_id: id,
        status: 'submitted',
      };
    });

    return result;
  }

  /**
   * SURVEY_ANSWER.UPSERT COMMAND
   * Source: specs/survey/survey.pillar.v2.yml
   *
   * HTTP: POST /v1/survey-answers
   */
  async upsertSurveyAnswer(
    request: SurveyAnswerUpsertRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: response exists
      const response = await this.responseRepo.findById(
        Number(request.response_id),
        queryRunner,
      );
      if (!response) {
        throw new NotFoundException({
          code: 'SURVEY_RESPONSE_NOT_FOUND',
          message: `Survey response with id ${request.response_id} not found`,
        });
      }

      // GUARD: response must be draft
      if (response.status !== 'draft') {
        throw new ConflictException({
          code: 'SURVEY_RESPONSE_NOT_DRAFT',
          message: `Survey response is not draft, current status: ${response.status}`,
        });
      }

      // WRITE: upsert survey answer
      const answerId = await this.answerRepo.upsert(
        {
          response_id: Number(request.response_id),
          question_id: Number(request.question_id),
          value_bool: request.value_bool !== undefined ? (request.value_bool ? 1 : 0) : null,
          value_text: request.value_text || null,
          value_num: request.value_num || null,
          value_date: request.value_date ? new Date(request.value_date) : null,
          value_json: request.value_json || null,
        },
        queryRunner,
      );

      // EMIT: SURVEY_ANSWER_SAVED event
      await this.outboxService.enqueue(
        {
          event_name: 'SURVEY_ANSWER_SAVED',
          event_version: 1,
          aggregate_type: 'SURVEY_RESPONSE',
          aggregate_id: request.response_id!,
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            survey_answer_id: answerId,
            response_id: request.response_id,
            question_id: request.question_id,
          },
        },
        queryRunner,
      );

      return {
        survey_answer_id: answerId,
      };
    });

    return result;
  }

  /**
   * SURVEY_ANSWER.GET COMMAND
   * Source: specs/survey/survey.pillar.v2.yml
   *
   * HTTP: GET /v1/survey-answers/{answer_id}
   */
  async getSurveyAnswer(id: number) {
    const answer = await this.answerRepo.findById(id);

    if (!answer) {
      throw new NotFoundException({
        code: 'SURVEY_ANSWER_NOT_FOUND',
        message: `Survey answer with id ${id} not found`,
      });
    }

    return answer;
  }

  /**
   * SURVEY_ANSWER.LIST_BY_RESPONSE COMMAND
   * Source: specs/survey/survey.pillar.v2.yml
   *
   * HTTP: GET /v1/survey-responses/{response_id}/answers
   */
  async listSurveyAnswersByResponse(responseId: number) {
    const answers = await this.answerRepo.findByResponseId(responseId);
    return { items: answers };
  }

  /**
   * SURVEY_RESPONSE_FILE.ATTACH COMMAND
   * Source: specs/survey/survey.pillar.v2.yml
   *
   * HTTP: POST /v1/survey-responses/{response_id}/files
   */
  async attachSurveyResponseFile(
    request: SurveyResponseFileAttachRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: response exists
      const response = await this.responseRepo.findById(
        Number(request.response_id),
        queryRunner,
      );
      if (!response) {
        throw new NotFoundException({
          code: 'SURVEY_RESPONSE_NOT_FOUND',
          message: `Survey response with id ${request.response_id} not found`,
        });
      }

      // WRITE: upsert survey response file
      const fileId = await this.responseFileRepo.upsert(
        {
          response_id: Number(request.response_id),
          file_upload_id: Number(request.file_upload_id),
          kind: request.kind || 'evidence',
          sort_order: request.sort_order || 0,
          meta_json: request.meta_json || null,
        },
        queryRunner,
      );

      // EMIT: SURVEY_RESPONSE_FILE_ATTACHED event
      await this.outboxService.enqueue(
        {
          event_name: 'SURVEY_RESPONSE_FILE_ATTACHED',
          event_version: 1,
          aggregate_type: 'SURVEY_RESPONSE',
          aggregate_id: request.response_id!,
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            survey_response_file_id: fileId,
            response_id: request.response_id,
            file_upload_id: request.file_upload_id,
          },
        },
        queryRunner,
      );

      return {
        survey_response_file_id: fileId,
      };
    });

    return result;
  }

  /**
   * SURVEY_RESPONSE_FILE.LIST_BY_RESPONSE COMMAND
   * Source: specs/survey/survey.pillar.v2.yml
   *
   * HTTP: GET /v1/survey-responses/{response_id}/files
   */
  async listSurveyResponseFiles(responseId: number) {
    const files = await this.responseFileRepo.findByResponseId(responseId);
    return { items: files };
  }
}
