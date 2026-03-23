import { IsNumber, IsString, IsNotEmpty, MaxLength, IsOptional, IsObject } from 'class-validator';

/**
 * OnboardingProgressUpsertDto
 * Source: specs/identity/identity.pillar.v2.yml — UpsertOnboardingProgress command
 */
export class OnboardingProgressUpsertDto {
  @IsNumber()
  user_id: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  step_code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  state: string;

  @IsObject()
  @IsOptional()
  meta_json?: Record<string, any>;
}
