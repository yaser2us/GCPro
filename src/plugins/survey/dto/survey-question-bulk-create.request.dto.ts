import { IsString, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { SurveyQuestionCreateRequestDto } from './survey-question-create.request.dto';

/**
 * SurveyQuestion.CreateBulk Request DTO
 * Source: specs/survey/survey.pillar.v2.yml
 *
 * HTTP: POST /v1/survey-versions/{survey_version_id}/questions/bulk
 */
export class SurveyQuestionBulkCreateRequestDto {
  @IsOptional()
  @IsString()
  survey_version_id?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SurveyQuestionCreateRequestDto)
  questions: SurveyQuestionCreateRequestDto[];
}
