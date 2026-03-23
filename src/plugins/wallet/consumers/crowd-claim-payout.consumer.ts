import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../../corekit/services/event-bus.service';
import { CrowdClaimPayoutHandler } from '../handlers/crowd-claim-payout.handler';

/**
 * CrowdClaimPayoutConsumer — Phase 7C (Wallet plugin)
 *
 * Subscribes to CROWD_CLAIM_PAYOUT_PAID and triggers GC_WALLET credit for
 * the claimant via wallet_deposit_intent.
 * Fire-and-forget: errors logged but do not block the crowd payout flow.
 *
 * Source: specs/crowd/crowd.pillar.v2.yml CROWD_CLAIM_PAYOUT_PAID
 */
@Injectable()
export class CrowdClaimPayoutConsumer implements OnModuleInit {
  private readonly logger = new Logger(CrowdClaimPayoutConsumer.name);

  constructor(
    private readonly handler: CrowdClaimPayoutHandler,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('CROWD_CLAIM_PAYOUT_PAID', this.onCrowdClaimPayoutPaid.bind(this));
    this.logger.log('Phase 7C: Registered for CROWD_CLAIM_PAYOUT_PAID events (wallet credit)');
  }

  async onCrowdClaimPayoutPaid(event: any): Promise<void> {
    this.logger.log(
      `Phase 7C: processing CROWD_CLAIM_PAYOUT_PAID — payout_id=${event.payout_id}`,
    );
    try {
      await this.handler.handle(event);
    } catch (error) {
      this.logger.error(
        `Phase 7C: crowd claim payout wallet credit failed for payout_id=${event.payout_id}: ${error.message}`,
        error.stack,
      );
    }
  }
}
