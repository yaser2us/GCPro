import { IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * Survey.Create Request DTO
 * Source: specs/survey/survey.pillar.v2.yml
 *
 * HTTP: POST /v1/surveys
 * Idempotency: Via Idempotency-Key header
 */
export class SurveyCreateRequestDto {
  @IsString()
  @MaxLength(64)
  code: string;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  description?: string;
}
