import { IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * SurveyVersion.Create Request DTO
 * Source: specs/survey/survey.pillar.v2.yml
 *
 * HTTP: POST /v1/surveys/{survey_id}/versions
 * Idempotency: Via Idempotency-Key header
 */
export class SurveyVersionCreateRequestDto {
  @IsOptional()
  @IsString()
  survey_id?: string;

  @IsString()
  @MaxLength(32)
  version: string;

  @IsOptional()
  schema_json?: any;

  @IsOptional()
  logic_json?: any;

  @IsOptional()
  meta_json?: any;
}
