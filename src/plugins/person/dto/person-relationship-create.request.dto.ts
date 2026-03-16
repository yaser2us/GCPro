import { IsString, MaxLength } from 'class-validator';

/**
 * PersonRelationship.Create Request DTO
 * Source: specs/person/person.pillar.v2.yml
 *
 * HTTP: POST /v1/persons/{person_id}/relationships
 * Idempotency: Via UNIQUE(from_person_id, to_person_id, relation_type)
 */
export class PersonRelationshipCreateRequestDto {
  @IsString()
  to_person_id: string;

  @IsString()
  @MaxLength(32)
  relation_type: string;
}
