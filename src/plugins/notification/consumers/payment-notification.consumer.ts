import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../../corekit/services/event-bus.service';
import { PaymentNotificationHandler } from '../handlers/payment-notification.handler';

/**
 * PaymentNotificationConsumer — Phase 8C
 *
 * Subscribes to PAYMENT_SUCCEEDED and PAYMENT_FAILED events and queues
 * receipt / failure notifications to the account holder.
 * Fire-and-forget: errors are logged but do not block the payment flow.
 *
 * Source: specs/payment/payment.pillar.v2.yml — integration.notification
 */
@Injectable()
export class PaymentNotificationConsumer implements OnModuleInit {
  private readonly logger = new Logger(PaymentNotificationConsumer.name);

  constructor(
    private readonly handler: PaymentNotificationHandler,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('PAYMENT_SUCCEEDED', this.onPaymentSucceeded.bind(this));
    this.eventBus.subscribe('PAYMENT_FAILED', this.onPaymentFailed.bind(this));
    this.logger.log(
      'Phase 8C: Registered for PAYMENT_SUCCEEDED + PAYMENT_FAILED events (payment notification)',
    );
  }

  async onPaymentSucceeded(event: any): Promise<void> {
    this.logger.log(
      `Phase 8C: processing PAYMENT_SUCCEEDED — intent_id=${event.intent_id}`,
    );
    try {
      await this.handler.handle('PAYMENT_SUCCEEDED', event);
    } catch (error) {
      this.logger.error(
        `Phase 8C: payment succeeded notification failed for intent_id=${event.intent_id}: ${error.message}`,
        error.stack,
      );
    }
  }

  async onPaymentFailed(event: any): Promise<void> {
    this.logger.log(
      `Phase 8C: processing PAYMENT_FAILED — intent_id=${event.intent_id}`,
    );
    try {
      await this.handler.handle('PAYMENT_FAILED', event);
    } catch (error) {
      this.logger.error(
        `Phase 8C: payment failed notification failed for intent_id=${event.intent_id}: ${error.message}`,
        error.stack,
      );
    }
  }
}
