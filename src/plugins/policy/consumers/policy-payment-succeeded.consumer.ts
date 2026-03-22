import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PolicyPaymentSucceededHandler } from '../handlers/policy-payment-succeeded.handler';
import { EventBusService } from '../../../corekit/services/event-bus.service';

/**
 * Policy Payment Succeeded Event Consumer
 * Listens to PAYMENT_SUCCEEDED events and activates the associated policy
 *
 * Based on specs/policy/policy.pillar.v2.yml integration section
 *
 * Events Consumed:
 * 1. PAYMENT_SUCCEEDED (emitted by payment plugin)
 *
 * Source: payment plugin
 * Handler: PolicyPaymentSucceededHandler
 *
 * Architecture:
 * - Consumer (this file): Thin routing layer, registers for events
 * - Handler (policy-payment-succeeded.handler.ts): Business logic for policy activation
 *
 * Flow:
 * 1. Payment plugin records payment → PAYMENT_SUCCEEDED event
 * 2. OutboxPublisher publishes event to EventBus
 * 3. This consumer receives event, filters by purpose_code='premium' AND ref_type='policy'
 * 4. Delegates to PolicyPaymentSucceededHandler.handle()
 * 5. Handler activates policy and emits POLICY_ACTIVATED event
 *
 * Idempotency:
 * - Handled by handler via policy.status check (skip if already 'active')
 * - Safe to retry on failure
 */
@Injectable()
export class PolicyPaymentSucceededConsumer implements OnModuleInit {
  private readonly logger = new Logger(PolicyPaymentSucceededConsumer.name);

  constructor(
    private readonly handler: PolicyPaymentSucceededHandler,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Register event handlers on module initialization
   */
  onModuleInit() {
    this.eventBus.subscribe(
      'PAYMENT_SUCCEEDED',
      this.handlePaymentSucceeded.bind(this),
    );
    this.logger.log('Registered for PAYMENT_SUCCEEDED events');
  }

  /**
   * Handle PAYMENT_SUCCEEDED event - activate associated policy
   *
   * Event payload:
   * - intent_id: Payment intent ID
   * - intent_key: Payment intent key
   * - amount: Payment amount
   * - currency: Currency code
   * - purpose_code: Must be 'premium' to be processed
   * - ref_type: Must be 'policy' to be processed
   * - ref_id: Policy ID as string
   * - payment_method_id: Payment method used
   * - account_id: Account ID (optional)
   *
   * Filter: Only processes events where purpose_code === 'premium' AND ref_type === 'policy'
   */
  async handlePaymentSucceeded(event: {
    intent_id: number;
    intent_key: string;
    amount: number;
    currency: string;
    purpose_code: string;
    ref_type: string;
    ref_id: string;
    payment_method_id: number;
    account_id?: number;
  }): Promise<void> {
    // Filter: only process premium policy payments
    if (event.purpose_code !== 'premium' || event.ref_type !== 'policy') {
      this.logger.log(
        `Skipping PAYMENT_SUCCEEDED event: intent_id=${event.intent_id}, purpose_code=${event.purpose_code}, ref_type=${event.ref_type} (not a premium policy payment)`,
      );
      return;
    }

    this.logger.log(
      `Processing PAYMENT_SUCCEEDED event: intent_id=${event.intent_id}, policy_id=${event.ref_id}, amount=${event.amount}`,
    );

    try {
      const result = await this.handler.handle(event);

      if (result.skipped) {
        this.logger.log(
          `Policy activation skipped: intent_id=${event.intent_id}, policy_id=${event.ref_id}, reason=${result.reason}`,
        );
      } else {
        this.logger.log(
          `Policy activated successfully: intent_id=${event.intent_id}, policy_id=${result.policy_id}, status=${result.status}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to process payment succeeded for policy activation: intent_id=${event.intent_id}, policy_id=${event.ref_id}, error=${error.message}`,
        error.stack,
      );
      throw error; // Re-throw to allow retry by outbox processor
    }
  }
}
