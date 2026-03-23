import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../../corekit/services/event-bus.service';
import { ClaimEventNotificationHandler } from '../handlers/claim-event-notification.handler';

/**
 * ClaimEventNotificationConsumer — Phase 5
 *
 * Subscribes to CLAIM_SUBMITTED, CLAIM_APPROVED, CLAIM_REJECTED, CLAIM_SETTLED.
 * Delegates to ClaimEventNotificationHandler to queue notification messages.
 * Fire-and-forget: errors logged, do not block the claim flow.
 */
@Injectable()
export class ClaimEventNotificationConsumer implements OnModuleInit {
  private readonly logger = new Logger(ClaimEventNotificationConsumer.name);

  constructor(
    private readonly handler: ClaimEventNotificationHandler,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit() {
    const events = ['CLAIM_SUBMITTED', 'CLAIM_APPROVED', 'CLAIM_REJECTED', 'CLAIM_SETTLED'] as const;
    for (const eventName of events) {
      this.eventBus.subscribe(eventName, (event: any) => this.onClaimEvent(eventName, event));
    }
    this.logger.log('Phase 5: Registered for CLAIM_SUBMITTED/APPROVED/REJECTED/SETTLED events');
  }

  async onClaimEvent(
    eventName: 'CLAIM_SUBMITTED' | 'CLAIM_APPROVED' | 'CLAIM_REJECTED' | 'CLAIM_SETTLED',
    event: any,
  ): Promise<void> {
    this.logger.log(`Phase 5: processing ${eventName} — claim_id=${event.claim_id}`);
    try {
      await this.handler.handle(eventName, event);
    } catch (error) {
      this.logger.error(
        `Phase 5: notification failed for ${eventName} claim_id=${event.claim_id}: ${error.message}`,
        error.stack,
      );
    }
  }
}
