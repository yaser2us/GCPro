import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { SurveyWorkflowService } from '../services/survey.workflow.service';
import { SurveyCreateRequestDto } from '../dto/survey-create.request.dto';
import { SurveyVersionCreateRequestDto } from '../dto/survey-version-create.request.dto';
import { SurveyQuestionBulkCreateRequestDto } from '../dto/survey-question-bulk-create.request.dto';
import { SurveyQuestionOptionBulkCreateRequestDto } from '../dto/survey-question-option-bulk-create.request.dto';
import { SurveyResponseCreateRequestDto } from '../dto/survey-response-create.request.dto';
import { SurveyResponseSubmitRequestDto } from '../dto/survey-response-submit.request.dto';
import { SurveyAnswerUpsertRequestDto } from '../dto/survey-answer-upsert.request.dto';
import { SurveyResponseFileAttachRequestDto } from '../dto/survey-response-file-attach.request.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * Survey Controller
 * Handles HTTP endpoints for survey operations
 *
 * Based on specs/survey/survey.pillar.v2.yml commands section
 */
@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class SurveyController {
  constructor(private readonly workflowService: SurveyWorkflowService) {}

  // ──────────────────────────────────────────────────────────────────────────
  // SURVEY ENDPOINTS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * CREATE SURVEY
   * POST /v1/surveys
   */
  @Post('v1/surveys')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('survey:admin', 'survey:manage')
  async createSurvey(
    @Body() request: SurveyCreateRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.createSurvey(request, actor, idempotencyKey);
  }

  /**
   * GET SURVEY
   * GET /v1/surveys/:survey_id
   */
  @Get('v1/surveys/:survey_id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('survey:read')
  async getSurvey(@Param('survey_id') surveyId: string) {
    return this.workflowService.getSurvey(Number(surveyId));
  }

  /**
   * LIST SURVEYS
   * GET /v1/surveys
   */
  @Get('v1/surveys')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('survey:read')
  async listSurveys() {
    return this.workflowService.listSurveys();
  }

  /**
   * DEACTIVATE SURVEY
   * POST /v1/surveys/:survey_id/deactivate
   */
  @Post('v1/surveys/:survey_id/deactivate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('survey:admin', 'survey:manage')
  async deactivateSurvey(
    @Param('survey_id') surveyId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.deactivateSurvey(
      Number(surveyId),
      actor,
      idempotencyKey,
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SURVEY VERSION ENDPOINTS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * CREATE SURVEY VERSION
   * POST /v1/surveys/:survey_id/versions
   */
  @Post('v1/surveys/:survey_id/versions')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('survey:admin', 'survey:manage')
  async createSurveyVersion(
    @Param('survey_id') surveyId: string,
    @Body() request: SurveyVersionCreateRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    // Set survey_id from path param
    request.survey_id = surveyId;

    return this.workflowService.createSurveyVersion(
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * GET SURVEY VERSION
   * GET /v1/survey-versions/:survey_version_id
   */
  @Get('v1/survey-versions/:survey_version_id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('survey:read')
  async getSurveyVersion(@Param('survey_version_id') versionId: string) {
    return this.workflowService.getSurveyVersion(Number(versionId));
  }

  /**
   * LIST SURVEY VERSIONS BY SURVEY
   * GET /v1/surveys/:survey_id/versions
   */
  @Get('v1/surveys/:survey_id/versions')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('survey:read')
  async listSurveyVersionsBySurvey(@Param('survey_id') surveyId: string) {
    return this.workflowService.listSurveyVersionsBySurvey(Number(surveyId));
  }

  /**
   * PUBLISH SURVEY VERSION
   * POST /v1/survey-versions/:survey_version_id/publish
   */
  @Post('v1/survey-versions/:survey_version_id/publish')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('survey:admin', 'survey:manage')
  async publishSurveyVersion(
    @Param('survey_version_id') versionId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.publishSurveyVersion(
      Number(versionId),
      actor,
      idempotencyKey,
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SURVEY QUESTION ENDPOINTS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * CREATE SURVEY QUESTIONS BULK
   * POST /v1/survey-versions/:survey_version_id/questions/bulk
   */
  @Post('v1/survey-versions/:survey_version_id/questions/bulk')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('survey:admin', 'survey:manage')
  async createSurveyQuestionsBulk(
    @Param('survey_version_id') versionId: string,
    @Body() request: SurveyQuestionBulkCreateRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    // Set survey_version_id from path param
    request.survey_version_id = versionId;

    return this.workflowService.createSurveyQuestionsBulk(
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * GET SURVEY QUESTION
   * GET /v1/survey-questions/:question_id
   */
  @Get('v1/survey-questions/:question_id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('survey:read')
  async getSurveyQuestion(@Param('question_id') questionId: string) {
    return this.workflowService.getSurveyQuestion(Number(questionId));
  }

  /**
   * LIST SURVEY QUESTIONS BY VERSION
   * GET /v1/survey-versions/:survey_version_id/questions
   */
  @Get('v1/survey-versions/:survey_version_id/questions')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('survey:read')
  async listSurveyQuestionsByVersion(
    @Param('survey_version_id') versionId: string,
  ) {
    return this.workflowService.listSurveyQuestionsByVersion(Number(versionId));
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SURVEY QUESTION OPTION ENDPOINTS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * CREATE SURVEY QUESTION OPTIONS BULK
   * POST /v1/survey-questions/:question_id/options/bulk
   */
  @Post('v1/survey-questions/:question_id/options/bulk')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('survey:admin', 'survey:manage')
  async createSurveyQuestionOptionsBulk(
    @Param('question_id') questionId: string,
    @Body() request: SurveyQuestionOptionBulkCreateRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    // Set question_id from path param
    request.question_id = questionId;

    return this.workflowService.createSurveyQuestionOptionsBulk(
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * LIST SURVEY QUESTION OPTIONS
   * GET /v1/survey-questions/:question_id/options
   */
  @Get('v1/survey-questions/:question_id/options')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('survey:read')
  async listSurveyQuestionOptions(@Param('question_id') questionId: string) {
    return this.workflowService.listSurveyQuestionOptions(Number(questionId));
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SURVEY RESPONSE ENDPOINTS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * CREATE SURVEY RESPONSE
   * POST /v1/survey-responses
   */
  @Post('v1/survey-responses')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('survey:respond')
  async createSurveyResponse(
    @Body() request: SurveyResponseCreateRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.createSurveyResponse(
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * GET SURVEY RESPONSE
   * GET /v1/survey-responses/:response_id
   */
  @Get('v1/survey-responses/:response_id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('survey:read')
  async getSurveyResponse(@Param('response_id') responseId: string) {
    return this.workflowService.getSurveyResponse(Number(responseId));
  }

  /**
   * LIST SURVEY RESPONSES
   * GET /v1/survey-responses
   */
  @Get('v1/survey-responses')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('survey:read')
  async listSurveyResponses() {
    return this.workflowService.listSurveyResponses();
  }

  /**
   * SUBMIT SURVEY RESPONSE
   * POST /v1/survey-responses/:response_id/submit
   */
  @Post('v1/survey-responses/:response_id/submit')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('survey:respond')
  async submitSurveyResponse(
    @Param('response_id') responseId: string,
    @Body() request: SurveyResponseSubmitRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.submitSurveyResponse(
      Number(responseId),
      request,
      actor,
      idempotencyKey,
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SURVEY ANSWER ENDPOINTS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * UPSERT SURVEY ANSWER
   * POST /v1/survey-answers
   */
  @Post('v1/survey-answers')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('survey:respond')
  async upsertSurveyAnswer(
    @Body() request: SurveyAnswerUpsertRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.upsertSurveyAnswer(
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * GET SURVEY ANSWER
   * GET /v1/survey-answers/:answer_id
   */
  @Get('v1/survey-answers/:answer_id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('survey:read')
  async getSurveyAnswer(@Param('answer_id') answerId: string) {
    return this.workflowService.getSurveyAnswer(Number(answerId));
  }

  /**
   * LIST SURVEY ANSWERS BY RESPONSE
   * GET /v1/survey-responses/:response_id/answers
   */
  @Get('v1/survey-responses/:response_id/answers')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('survey:read')
  async listSurveyAnswersByResponse(@Param('response_id') responseId: string) {
    return this.workflowService.listSurveyAnswersByResponse(Number(responseId));
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SURVEY RESPONSE FILE ENDPOINTS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * ATTACH SURVEY RESPONSE FILE
   * POST /v1/survey-responses/:response_id/files
   */
  @Post('v1/survey-responses/:response_id/files')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('survey:respond')
  async attachSurveyResponseFile(
    @Param('response_id') responseId: string,
    @Body() request: SurveyResponseFileAttachRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    // Set response_id from path param
    request.response_id = responseId;

    return this.workflowService.attachSurveyResponseFile(
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * LIST SURVEY RESPONSE FILES
   * GET /v1/survey-responses/:response_id/files
   */
  @Get('v1/survey-responses/:response_id/files')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('survey:read')
  async listSurveyResponseFiles(@Param('response_id') responseId: string) {
    return this.workflowService.listSurveyResponseFiles(Number(responseId));
  }
}
