import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { OutboxEvent } from '../entities/outbox-event.entity';
import { OutboxEventEnvelope } from '../types/outbox-envelope.type';

/**
 * Outbox service for reliable event publishing
 * Based on corekit.v1.yaml OutboxService
 *
 * Events are stored in the outbox table within the same transaction
 * as the business operation, then published asynchronously by a worker
 */
@Injectable()
export class OutboxService {
  /**
   * Enqueue an event to the outbox within a transaction
   *
   * @param envelope Event envelope with all required fields
   * @param queryRunner Transaction query runner
   */
  async enqueue(
    envelope: OutboxEventEnvelope,
    queryRunner: QueryRunner,
  ): Promise<void> {
    const outboxEvent = new OutboxEvent();

    outboxEvent.event_name = envelope.event_name;
    outboxEvent.event_version = envelope.event_version;
    outboxEvent.aggregate_type = envelope.aggregate_type;
    outboxEvent.aggregate_id = envelope.aggregate_id;
    outboxEvent.actor_user_id = envelope.actor_user_id;
    outboxEvent.occurred_at = envelope.occurred_at;
    outboxEvent.correlation_id = envelope.correlation_id;
    outboxEvent.causation_id = envelope.causation_id;
    outboxEvent.payload = envelope.payload;
    outboxEvent.dedupe_key = envelope.dedupe_key;
    outboxEvent.status = 'pending';

    // Save within the transaction
    await queryRunner.manager.save(OutboxEvent, outboxEvent);
  }

  /**
   * Get pending events for publishing (used by background worker)
   */
  async getPendingEvents(limit: number = 100): Promise<OutboxEvent[]> {
    // This would be used by a background worker
    // Not implemented yet, but showing the pattern
    return [];
  }
}
