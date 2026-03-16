import { IsString, IsOptional, IsBoolean, IsNumber, IsDateString } from 'class-validator';

/**
 * SurveyAnswer.Upsert Request DTO
 * Source: specs/survey/survey.pillar.v2.yml
 *
 * HTTP: POST /v1/survey-answers
 * Idempotency: Via Idempotency-Key header
 */
export class SurveyAnswerUpsertRequestDto {
  @IsString()
  response_id: string;

  @IsString()
  question_id: string;

  @IsOptional()
  @IsBoolean()
  value_bool?: boolean;

  @IsOptional()
  @IsString()
  value_text?: string;

  @IsOptional()
  @IsNumber()
  value_num?: number;

  @IsOptional()
  @IsDateString()
  value_date?: string;

  @IsOptional()
  value_json?: any;
}
