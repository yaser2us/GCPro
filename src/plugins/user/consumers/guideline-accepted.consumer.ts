import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { GuidelineAcceptedHandler } from '../handlers/guideline-accepted.handler';
import { EventBusService } from '../../../corekit/services/event-bus.service';

/**
 * Guideline Accepted Event Consumer
 * Listens to GUIDELINE_ACCEPTED events from the foundation pillar and records
 * onboarding progress in the user-identity plugin.
 *
 * Events Consumed:
 * 1. GUIDELINE_ACCEPTED (emitted by foundation/guideline plugin)
 *
 * Source: foundation plugin
 * Handler: GuidelineAcceptedHandler
 *
 * Architecture:
 * - Consumer (this file): Thin routing layer, registers for events
 * - Handler (guideline-accepted.handler.ts): Business logic for onboarding progress update
 *
 * Flow:
 * 1. Foundation plugin records guideline acceptance → GUIDELINE_ACCEPTED event
 * 2. OutboxPublisher publishes event to EventBus
 * 3. This consumer receives event, skips if no user_id in payload
 * 4. Delegates to GuidelineAcceptedHandler.handle()
 * 5. Handler upserts onboarding_progress step 'guideline_accepted'
 */
@Injectable()
export class GuidelineAcceptedConsumer implements OnModuleInit {
  private readonly logger = new Logger(GuidelineAcceptedConsumer.name);

  constructor(
    private readonly handler: GuidelineAcceptedHandler,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Register event handlers on module initialization
   */
  onModuleInit() {
    this.eventBus.subscribe(
      'GUIDELINE_ACCEPTED',
      this.handleGuidelineAccepted.bind(this),
    );
    this.logger.log('Registered for GUIDELINE_ACCEPTED events');
  }

  /**
   * Handle GUIDELINE_ACCEPTED event - record onboarding progress
   *
   * Event payload:
   * - acceptance_id: ID of the acceptance record
   * - version_id: ID of the guideline version accepted
   * - account_id: Associated account ID (optional)
   * - person_id: Associated person ID (optional)
   * - user_id: User ID who accepted the guideline (required to process)
   * - acceptance_status: Status of the acceptance
   * - channel: Channel through which the acceptance was recorded
   * - source: Source system of the acceptance
   *
   * Filter: Only processes events where user_id != null
   */
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
    // Skip if no user_id
    if (event.user_id == null) {
      this.logger.log(
        `Skipping GUIDELINE_ACCEPTED event: acceptance_id=${event.acceptance_id}, no user_id in payload`,
      );
      return;
    }

    this.logger.log(
      `Processing GUIDELINE_ACCEPTED event: acceptance_id=${event.acceptance_id}, user_id=${event.user_id}, version_id=${event.version_id}`,
    );

    try {
      const result = await this.handler.handle(event);

      if ((result as any).skipped) {
        this.logger.log(
          `Onboarding progress skipped: acceptance_id=${event.acceptance_id}, reason=${(result as any).reason}`,
        );
      } else {
        this.logger.log(
          `Onboarding progress recorded: acceptance_id=${event.acceptance_id}, user_id=${(result as any).user_id}, step_code=${(result as any).step_code}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to process guideline accepted for onboarding progress: acceptance_id=${event.acceptance_id}, user_id=${event.user_id}, error=${error.message}`,
        error.stack,
      );
      throw error; // Re-throw to allow retry by outbox processor
    }
  }
}
