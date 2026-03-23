import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { WalletThresholdBreachedHandler } from '../handlers/wallet-threshold-breached.handler';
import { EventBusService } from '../../../corekit/services/event-bus.service';

/**
 * WalletThresholdBreachedConsumer — C8
 *
 * Subscribes to WALLET_THRESHOLD_BREACHED events from the wallet plugin.
 * Delegates to WalletThresholdBreachedHandler to open a policy remediation case.
 * Fire-and-forget: errors logged but do not block the wallet flow.
 */
@Injectable()
export class WalletThresholdBreachedConsumer implements OnModuleInit {
  private readonly logger = new Logger(WalletThresholdBreachedConsumer.name);

  constructor(
    private readonly handler: WalletThresholdBreachedHandler,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('WALLET_THRESHOLD_BREACHED', this.onThresholdBreached.bind(this));
    this.logger.log('Registered for WALLET_THRESHOLD_BREACHED events');
  }

  async onThresholdBreached(event: any): Promise<void> {
    this.logger.log(
      `C8: processing WALLET_THRESHOLD_BREACHED — wallet_id=${event.wallet_id}, code=${event.threshold_code}`,
    );
    try {
      await this.handler.handle(event);
    } catch (error) {
      this.logger.error(
        `C8: remediation open failed for wallet_id=${event.wallet_id}: ${error.message}`,
        error.stack,
      );
    }
  }
}
