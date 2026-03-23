import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../../corekit/services/event-bus.service';
import { CrowdChargeNotificationHandler } from '../handlers/crowd-charge-notification.handler';

/**
 * CrowdChargeNotificationConsumer — Phase 7D (Notification plugin)
 *
 * Subscribes to CROWD_MEMBER_CHARGED and queues a push notification to the
 * insured member confirming their contribution charge.
 * Fire-and-forget: errors logged but do not block the charge flow.
 *
 * Source: specs/crowd/crowd.pillar.v2.yml CROWD_MEMBER_CHARGED
 */
@Injectable()
export class CrowdChargeNotificationConsumer implements OnModuleInit {
  private readonly logger = new Logger(CrowdChargeNotificationConsumer.name);

  constructor(
    private readonly handler: CrowdChargeNotificationHandler,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('CROWD_MEMBER_CHARGED', this.onCrowdMemberCharged.bind(this));
    this.logger.log('Phase 7D: Registered for CROWD_MEMBER_CHARGED events (charge notification)');
  }

  async onCrowdMemberCharged(event: any): Promise<void> {
    this.logger.log(
      `Phase 7D: processing CROWD_MEMBER_CHARGED — charge_id=${event.charge_id}`,
    );
    try {
      await this.handler.handle(event);
    } catch (error) {
      this.logger.error(
        `Phase 7D: crowd charge notification failed for charge_id=${event.charge_id}: ${error.message}`,
        error.stack,
      );
    }
  }
}
