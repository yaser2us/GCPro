import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClaimSettledHandler } from '../handlers/claim-settled.handler';
import { EventBusService } from '../../../corekit/services/event-bus.service';

/**
 * Claim Settled Event Consumer
 * Listens to CLAIM_SETTLED events and records policy benefit usage
 *
 * Based on specs/claim/claim.pillar.v2.yml cross-pillar integration section
 *
 * Events Consumed:
 * 1. CLAIM_SETTLED (emitted by claim plugin on settleClaim)
 *
 * Source: claim plugin
 * Handler: ClaimSettledHandler
 *
 * Architecture:
 * - Consumer (this file): Thin routing layer, registers for events
 * - Handler (claim-settled.handler.ts): Business logic for benefit usage tracking
 *
 * Flow:
 * 1. Claim plugin settles claim → CLAIM_SETTLED event
 * 2. OutboxPublisher publishes event to EventBus
 * 3. This consumer receives event, skips if no policy_id in payload
 * 4. Delegates to ClaimSettledHandler.handle()
 * 5. Handler increments policy_benefit_usage for the period
 *
 * Idempotency:
 * - Handled by handler via raw upsert/increment logic
 * - Safe to retry on failure
 */
@Injectable()
export class ClaimSettledConsumer implements OnModuleInit {
  private readonly logger = new Logger(ClaimSettledConsumer.name);

  constructor(
    private readonly handler: ClaimSettledHandler,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Register event handlers on module initialization
   */
  onModuleInit() {
    this.eventBus.subscribe(
      'CLAIM_SETTLED',
      this.handleClaimSettled.bind(this),
    );
    this.logger.log('Registered for CLAIM_SETTLED events');
  }

  /**
   * Handle CLAIM_SETTLED event - record policy benefit usage
   *
   * Event payload:
   * - claim_id: ID of the settled claim
   * - claim_number: Human-readable claim number
   * - approved_amount: Amount approved for settlement
   * - period_key: The billing/benefit period key
   * - policy_id: Associated policy ID (optional - skip if absent)
   * - item_code: Benefit item code (optional - defaults to 'general')
   *
   * Filter: Only processes events where policy_id != null
   */
  async handleClaimSettled(event: {
    claim_id: number;
    claim_number: string;
    approved_amount: number;
    period_key: string;
    policy_id?: number | null;
    item_code?: string | null;
  }): Promise<void> {
    // Skip if no policy_id — this claim is not linked to a policy
    if (event.policy_id == null) {
      this.logger.log(
        `Skipping CLAIM_SETTLED event: claim_id=${event.claim_id}, no policy_id in payload`,
      );
      return;
    }

    this.logger.log(
      `Processing CLAIM_SETTLED event: claim_id=${event.claim_id}, policy_id=${event.policy_id}, approved_amount=${event.approved_amount}`,
    );

    try {
      const result = await this.handler.handle(event);

      if ((result as any).skipped) {
        this.logger.log(
          `Benefit usage tracking skipped: claim_id=${event.claim_id}, reason=${(result as any).reason}`,
        );
      } else {
        this.logger.log(
          `Benefit usage recorded: claim_id=${event.claim_id}, policy_id=${(result as any).policy_id}, period_key=${(result as any).period_key}, item_code=${(result as any).item_code}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to process claim settled for benefit usage: claim_id=${event.claim_id}, policy_id=${event.policy_id}, error=${error.message}`,
        error.stack,
      );
      throw error; // Re-throw to allow retry by outbox processor
    }
  }
}
