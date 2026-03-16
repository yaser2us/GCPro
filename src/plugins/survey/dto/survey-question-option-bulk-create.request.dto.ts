import { IsString, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { SurveyQuestionOptionCreateRequestDto } from './survey-question-option-create.request.dto';

/**
 * SurveyQuestionOption.CreateBulk Request DTO
 * Source: specs/survey/survey.pillar.v2.yml
 *
 * HTTP: POST /v1/survey-questions/{question_id}/options/bulk
 */
export class SurveyQuestionOptionBulkCreateRequestDto {
  @IsOptional()
  @IsString()
  question_id?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SurveyQuestionOptionCreateRequestDto)
  options: SurveyQuestionOptionCreateRequestDto[];
}
