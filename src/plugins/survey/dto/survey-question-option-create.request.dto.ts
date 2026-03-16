import { IsString, IsOptional, IsInt, MaxLength } from 'class-validator';

/**
 * SurveyQuestionOption.Create Request DTO
 * Source: specs/survey/survey.pillar.v2.yml
 *
 * Used for bulk option creation
 */
export class SurveyQuestionOptionCreateRequestDto {
  @IsString()
  @MaxLength(128)
  value: string;

  @IsString()
  @MaxLength(255)
  label: string;

  @IsOptional()
  @IsInt()
  sort_order?: number;
}
