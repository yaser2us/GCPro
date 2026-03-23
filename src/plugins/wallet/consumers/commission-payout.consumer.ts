import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../../corekit/services/event-bus.service';
import { CommissionPayoutHandler } from '../handlers/commission-payout.handler';

/**
 * CommissionPayoutConsumer — Phase 7B (Wallet plugin)
 *
 * Subscribes to PAYOUT_BATCH_COMPLETED and triggers wallet debit for each
 * wallet-payout item in the batch.
 * Fire-and-forget: errors logged but do not block the commission payout flow.
 *
 * Source: specs/commission/commission.pillar.v2.yml integration.wallet_pillar.PAYOUT_BATCH_COMPLETED
 */
@Injectable()
export class CommissionPayoutConsumer implements OnModuleInit {
  private readonly logger = new Logger(CommissionPayoutConsumer.name);

  constructor(
    private readonly handler: CommissionPayoutHandler,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('PAYOUT_BATCH_COMPLETED', this.onPayoutBatchCompleted.bind(this));
    this.logger.log('Phase 7B: Registered for PAYOUT_BATCH_COMPLETED events (wallet debit)');
  }

  async onPayoutBatchCompleted(event: any): Promise<void> {
    this.logger.log(
      `Phase 7B: processing PAYOUT_BATCH_COMPLETED — batch_id=${event.batch_id}`,
    );
    try {
      await this.handler.handle(event);
    } catch (error) {
      this.logger.error(
        `Phase 7B: commission payout debit failed for batch_id=${event.batch_id}: ${error.message}`,
        error.stack,
      );
    }
  }
}
