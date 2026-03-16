import { IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * Person.Create Request DTO
 * Source: specs/person/person.pillar.v2.yml
 *
 * HTTP: POST /v1/persons
 * Idempotency: Via Idempotency-Key header
 */
export class PersonCreateRequestDto {
  @IsOptional()
  @IsString()
  primary_user_id?: string;

  @IsString()
  @MaxLength(16)
  type: string;

  @IsString()
  @MaxLength(255)
  full_name: string;

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
}
