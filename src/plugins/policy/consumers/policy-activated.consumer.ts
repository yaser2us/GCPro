import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PolicyActivatedHandler } from '../handlers/policy-activated.handler';
import { EventBusService } from '../../../corekit/services/event-bus.service';

/**
 * PolicyActivatedConsumer — M5
 *
 * Subscribes to POLICY_ACTIVATED events and triggers benefit record initialisation.
 * Fire-and-forget: errors are logged but do not block the activation flow.
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
    this.logger.log('Registered for POLICY_ACTIVATED events');
  }

  async onPolicyActivated(event: { policy_id: number; [key: string]: any }): Promise<void> {
    this.logger.log(`M5: processing POLICY_ACTIVATED — policy_id=${event.policy_id}`);
    try {
      await this.handler.handle(event);
    } catch (error) {
      // Fire-and-forget: log error but don't rethrow (policy activation must not fail)
      this.logger.error(
        `M5: benefit init failed for policy_id=${event.policy_id}: ${error.message}`,
        error.stack,
      );
    }
  }
}
