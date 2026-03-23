import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../../corekit/services/event-bus.service';
import { PolicyActivatedHandler } from '../handlers/policy-activated.handler';

/**
 * PolicyActivatedConsumer — Phase 6 (Referral plugin)
 *
 * Subscribes to POLICY_ACTIVATED and triggers referral conversion reward granting.
 * Fire-and-forget: errors are logged but do not block policy activation.
 */
@Injectable()
export class PolicyActivatedConsumer implements OnModuleInit {
  private readonly logger = new Logger(PolicyActivatedConsumer.name);

  constructor(
    private readonly handler: PolicyActivatedHandler,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('POLICY_ACTIVATED', this.onPolicyActivated.bind(this));
    this.logger.log('Phase 6: Registered for POLICY_ACTIVATED events (referral rewards)');
  }

  async onPolicyActivated(event: any): Promise<void> {
    this.logger.log(`Phase 6: processing POLICY_ACTIVATED — policy_id=${event.policy_id}`);
    try {
      await this.handler.handle(event);
    } catch (error) {
      this.logger.error(
        `Phase 6: referral reward grant failed for policy_id=${event.policy_id}: ${error.message}`,
        error.stack,
      );
    }
  }
}
