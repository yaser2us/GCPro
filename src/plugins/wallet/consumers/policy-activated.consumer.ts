import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PolicyActivatedHandler } from '../handlers/policy-activated.handler';
import { EventBusService } from '../../../corekit/services/event-bus.service';

/**
 * Policy Activated Event Consumer
 * Listens to POLICY_ACTIVATED events and creates a spend intent for premium deduction
 *
 * Based on specs/wallet-advanced/wallet-advanced.pillar.v2.yml integration section
 *
 * Events Consumed:
 * 1. POLICY_ACTIVATED (emitted by policy plugin)
 *
 * Source: policy plugin
 * Handler: PolicyActivatedHandler
 *
 * Architecture:
 * - Consumer (this file): Thin routing layer, registers for events
 * - Handler (policy-activated.handler.ts): Business logic for spend intent creation
 *
 * Flow:
 * 1. Policy plugin activates policy → POLICY_ACTIVATED event
 * 2. OutboxPublisher publishes event to EventBus
 * 3. This consumer receives event and delegates to handler
 * 4. Handler creates WalletSpendIntent for premium deduction
 * 5. Handler emits SPEND_INTENT_CREATED event
 *
 * Idempotency:
 * - Handled by handler via UNIQUE(idempotency_key) = 'policy_premium_spend_{policy_id}'
 * - Safe to retry on failure
 */
@Injectable()
export class PolicyActivatedConsumer implements OnModuleInit {
  private readonly logger = new Logger(PolicyActivatedConsumer.name);

  constructor(
    private readonly handler: PolicyActivatedHandler,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Register event handlers on module initialization
   */
  onModuleInit() {
    this.eventBus.subscribe(
      'POLICY_ACTIVATED',
      this.handlePolicyActivated.bind(this),
    );
    this.logger.log('Registered for POLICY_ACTIVATED events');
  }

  /**
   * Handle POLICY_ACTIVATED event - create spend intent for premium deduction
   *
   * Event payload:
   * - policy_id: ID of the activated policy
   * - intent_id: Payment intent ID (optional)
   * - amount: Premium amount from payment (optional)
   * - currency: Currency code (optional)
   */
  async handlePolicyActivated(event: {
    policy_id: number;
    intent_id?: number;
    amount?: number;
    currency?: string;
  }): Promise<void> {
    this.logger.log(
      `Processing POLICY_ACTIVATED event: policy_id=${event.policy_id}, amount=${event.amount ?? 'from billing plan'}`,
    );

    try {
      const result = await this.handler.handle(event);

      if (result.skipped) {
        this.logger.log(
          `Spend intent creation skipped: policy_id=${event.policy_id}, reason=${result.reason}`,
        );
      } else {
        this.logger.log(
          `Spend intent created successfully: policy_id=${event.policy_id}, spend_intent_id=${result.spend_intent_id}, wallet_id=${result.wallet_id}, amount=${result.amount}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to process policy activated for spend intent creation: policy_id=${event.policy_id}, error=${error.message}`,
        error.stack,
      );
      throw error; // Re-throw to allow retry by outbox processor
    }
  }
}
