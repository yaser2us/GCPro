/**
 * Outbox event envelope structure
 * Based on corekit.v1.yaml OutboxEventEnvelope
 */
export interface OutboxEventEnvelope {
  event_name: string; // Event name in UPPER_SNAKE_CASE
  event_version: number; // Event schema version
  aggregate_type: string; // Type of aggregate (e.g., 'MISSION', 'CLAIM')
  aggregate_id: string; // ID of the aggregate instance
  actor_user_id: string; // Who triggered this event
  occurred_at: Date; // When the event occurred
  correlation_id: string; // Trace across services
  causation_id: string; // What caused this event
  payload: Record<string, any>; // Event-specific data
  dedupe_key?: string; // Optional deduplication key
}
