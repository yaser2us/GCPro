import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../../corekit/services/event-bus.service';
import { GuidelineAcceptedHandler } from '../handlers/guideline-accepted.handler';

/**
 * GuidelineAcceptedConsumer (identity plugin)
 * Subscribes to GUIDELINE_ACCEPTED events from Foundation pillar.
 * Delegates to GuidelineAcceptedHandler → upserts onboarding_progress.
 * Source: specs/identity/identity.pillar.v2.yml — integration.foundation.consumers[GUIDELINE_ACCEPTED]
 */
@Injectable()
export class GuidelineAcceptedConsumer implements OnModuleInit {
  private readonly logger = new Logger(GuidelineAcceptedConsumer.name);

  constructor(
    private readonly handler: GuidelineAcceptedHandler,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('GUIDELINE_ACCEPTED', this.handleGuidelineAccepted.bind(this));
    this.logger.log('Registered for GUIDELINE_ACCEPTED events');
  }

  async handleGuidelineAccepted(event: {
    acceptance_id: number;
    version_id: number;
    account_id?: number | null;
    person_id?: number | null;
    user_id?: number | null;
    acceptance_status: string;
    channel: string;
    source: string;
  }): Promise<void> {
    this.logger.log(
      `Processing GUIDELINE_ACCEPTED: acceptance_id=${event.acceptance_id}, user_id=${event.user_id}`,
    );

    try {
      const result = await this.handler.handle(event);
      if ('skipped' in result) {
        this.logger.warn(`GUIDELINE_ACCEPTED skipped: reason=${result.reason}`);
      } else {
        this.logger.log(
          `GUIDELINE_ACCEPTED processed: user_id=${result.user_id}, step=${result.step_code}, state=${result.state}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to process GUIDELINE_ACCEPTED: acceptance_id=${event.acceptance_id}, error=${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
