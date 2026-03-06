/**
 * MissionDefinition.Publish Request DTO
 * Source: specs/mission/mission.pillar.yml lines 86-87 & command lines 178-208
 *
 * HTTP: POST /v1/missions/definitions/{id}/publish
 * Idempotency: Via Idempotency-Key header
 */
export class MissionDefinitionPublishRequestDto {
  // No request body fields - idempotency_key comes from header
}
