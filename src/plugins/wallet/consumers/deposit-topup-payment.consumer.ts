import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DepositTopupPaymentHandler } from '../handlers/deposit-topup-payment.handler';
import { EventBusService } from '../../../corekit/services/event-bus.service';

/**
 * DepositTopupPaymentConsumer — C4
 *
 * Subscribes to PAYMENT_SUCCEEDED events and forwards to DepositTopupPaymentHandler.
 * The handler filters for purpose_code='deposit_topup' only.
 * Fire-and-forget: errors logged but do not block the payment flow.
 */
@Injectable()
export class DepositTopupPaymentConsumer implements OnModuleInit {
  private readonly logger = new Logger(DepositTopupPaymentConsumer.name);

  constructor(
    private readonly handler: DepositTopupPaymentHandler,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('PAYMENT_SUCCEEDED', this.onPaymentSucceeded.bind(this));
    this.logger.log('C4: Registered for PAYMENT_SUCCEEDED events');
  }

  async onPaymentSucceeded(event: any): Promise<void> {
    if (event.purpose_code !== 'deposit_topup') {
      return;
    }
    this.logger.log(`C4: processing PAYMENT_SUCCEEDED — intent_id=${event.intent_id}`);
    try {
      await this.handler.handle(event);
    } catch (error) {
      this.logger.error(
        `C4: deposit top-up credit failed for intent_id=${event.intent_id}: ${error.message}`,
        error.stack,
      );
    }
  }
}
