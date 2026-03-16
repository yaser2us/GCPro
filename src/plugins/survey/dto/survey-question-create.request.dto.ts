import { IsString, IsOptional, IsBoolean, IsInt, MaxLength } from 'class-validator';

/**
 * SurveyQuestion.Create Request DTO
 * Source: specs/survey/survey.pillar.v2.yml
 *
 * Used for bulk question creation
 */
export class SurveyQuestionCreateRequestDto {
  @IsString()
  @MaxLength(64)
  code: string;

  @IsString()
  @MaxLength(255)
  label: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  help_text?: string;

  @IsString()
  @MaxLength(16)
  answer_type: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsInt()
  sort_order?: number;

  @IsOptional()
  rules_json?: any;

  @IsOptional()
  meta_json?: any;
}
