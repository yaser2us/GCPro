import { IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * PersonIdentity.Add Request DTO
 * Source: specs/person/person.pillar.v2.yml
 *
 * HTTP: POST /v1/persons/{person_id}/identities
 * Idempotency: Via UNIQUE(id_type, id_no)
 */
export class PersonIdentityAddRequestDto {
  @IsString()
  @MaxLength(32)
  id_type: string;

  @IsString()
  @MaxLength(64)
  id_no: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  country?: string;
}
