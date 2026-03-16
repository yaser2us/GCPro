import { IsString, IsOptional } from 'class-validator';

/**
 * SurveyResponse.Create Request DTO
 * Source: specs/survey/survey.pillar.v2.yml
 *
 * HTTP: POST /v1/survey-responses
 * Idempotency: Via Idempotency-Key header
 */
export class SurveyResponseCreateRequestDto {
  @IsString()
  survey_version_id: string;

  @IsString()
  actor_ref_id: string;

  @IsString()
  subject_ref_id: string;

  @IsOptional()
  meta_json?: any;
}
