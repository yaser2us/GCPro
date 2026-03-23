import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../../corekit/services/event-bus.service';
import { ClaimSettledPayoutHandler } from '../handlers/claim-settled-payout.handler';

/**
 * ClaimSettledPayoutConsumer — Phase 5
 *
 * Subscribes to CLAIM_SETTLED events and triggers deposit wallet credit for the claimant.
 * Fire-and-forget: errors logged but do not block the claim settlement flow.
 */
@Injectable()
export class ClaimSettledPayoutConsumer implements OnModuleInit {
  private readonly logger = new Logger(ClaimSettledPayoutConsumer.name);

  constructor(
    private readonly handler: ClaimSettledPayoutHandler,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('CLAIM_SETTLED', this.onClaimSettled.bind(this));
    this.logger.log('Phase 5: Registered for CLAIM_SETTLED events (wallet payout)');
  }

  async onClaimSettled(event: any): Promise<void> {
    this.logger.log(`Phase 5: processing CLAIM_SETTLED — claim_id=${event.claim_id}`);
    try {
      await this.handler.handle(event);
    } catch (error) {
      this.logger.error(
        `Phase 5: claim payout failed for claim_id=${event.claim_id}: ${error.message}`,
        error.stack,
      );
    }
  }
}
