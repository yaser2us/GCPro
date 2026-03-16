import { IsString, IsOptional, IsInt, MaxLength } from 'class-validator';

/**
 * SurveyResponseFile.Attach Request DTO
 * Source: specs/survey/survey.pillar.v2.yml
 *
 * HTTP: POST /v1/survey-responses/{response_id}/files
 * Idempotency: Via Idempotency-Key header
 */
export class SurveyResponseFileAttachRequestDto {
  @IsOptional()
  @IsString()
  response_id?: string;

  @IsString()
  file_upload_id: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  kind?: string;

  @IsOptional()
  @IsInt()
  sort_order?: number;

  @IsOptional()
  meta_json?: any;
}
