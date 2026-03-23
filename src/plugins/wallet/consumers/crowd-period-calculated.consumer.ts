import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CrowdChargeHandler } from '../handlers/crowd-charge.handler';
import { EventBusService } from '../../../corekit/services/event-bus.service';

/**
 * CrowdPeriodCalculatedConsumer — C6
 *
 * Subscribes to CROWD_PERIOD_CALCULATED events and triggers deposit wallet
 * deductions for each member's crowd share charge.
 * Fire-and-forget: errors logged but do not block the crowd calculation flow.
 */
@Injectable()
export class CrowdPeriodCalculatedConsumer implements OnModuleInit {
  private readonly logger = new Logger(CrowdPeriodCalculatedConsumer.name);

  constructor(
    private readonly handler: CrowdChargeHandler,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('CROWD_PERIOD_CALCULATED', this.onPeriodCalculated.bind(this));
    this.logger.log('Registered for CROWD_PERIOD_CALCULATED events');
  }

  async onPeriodCalculated(event: { period_id: number; [key: string]: any }): Promise<void> {
    this.logger.log(`C6: processing CROWD_PERIOD_CALCULATED — period_id=${event.period_id}`);
    try {
      await this.handler.handle(event);
    } catch (error) {
      this.logger.error(
        `C6: crowd charge processing failed for period_id=${event.period_id}: ${error.message}`,
        error.stack,
      );
    }
  }
}
