import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AutoTopupHandler } from '../handlers/auto-topup.handler';
import { EventBusService } from '../../../corekit/services/event-bus.service';

/**
 * AutoTopupConsumer — C4
 *
 * Subscribes to WALLET_THRESHOLD_BREACHED events and triggers the auto top-up flow.
 * Fire-and-forget: errors are logged but do not block the threshold breach flow.
 */
@Injectable()
export class AutoTopupConsumer implements OnModuleInit {
  private readonly logger = new Logger(AutoTopupConsumer.name);

  constructor(
    private readonly handler: AutoTopupHandler,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('WALLET_THRESHOLD_BREACHED', this.onThresholdBreached.bind(this));
    this.logger.log('C4: Registered for WALLET_THRESHOLD_BREACHED events');
  }

  async onThresholdBreached(event: any): Promise<void> {
    this.logger.log(
      `C4: processing WALLET_THRESHOLD_BREACHED — wallet_id=${event.wallet_id}, code=${event.threshold_code}`,
    );
    try {
      await this.handler.handle(event);
    } catch (error) {
      this.logger.error(
        `C4: auto top-up failed for wallet_id=${event.wallet_id}: ${error.message}`,
        error.stack,
      );
    }
  }
}
