import { IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * Person.Update Request DTO
 * Source: specs/person/person.pillar.v2.yml
 *
 * HTTP: PUT /v1/persons/{person_id}
 * Idempotency: Via Idempotency-Key header
 */
export class PersonUpdateRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  full_name?: string;

  @IsOptional()
  @IsString()
  dob?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  gender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  nationality?: string;

  // L3: income level and acquisition channel
  @IsOptional()
  @IsString()
  @MaxLength(32)
  income_level?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  media_channel?: string;
}
