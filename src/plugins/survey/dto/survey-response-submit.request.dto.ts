import { IsArray } from 'class-validator';

/**
 * SurveyResponse.Submit Request DTO
 * Source: specs/survey/survey.pillar.v2.yml
 *
 * HTTP: POST /v1/survey-responses/{response_id}/submit
 * Idempotency: Via Idempotency-Key header
 */
export class SurveyResponseSubmitRequestDto {
  @IsArray()
  answers: any[];
}
