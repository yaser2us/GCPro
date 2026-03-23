import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { UserActivatedHandler } from '../handlers/user-activated.handler';
import { EventBusService } from '../../../corekit/services/event-bus.service';

/**
 * UserActivatedConsumer — M10
 *
 * Subscribes to USER_ACTIVATED events and auto-assigns streak/milestone missions.
 * Fire-and-forget: errors are logged but do not block the activation flow.
 */
@Injectable()
export class UserActivatedConsumer implements OnModuleInit {
  private readonly logger = new Logger(UserActivatedConsumer.name);

  constructor(
    private readonly handler: UserActivatedHandler,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('USER_ACTIVATED', this.onUserActivated.bind(this));
    this.logger.log('Registered for USER_ACTIVATED events');
  }

  async onUserActivated(event: { user_id: number; [key: string]: any }): Promise<void> {
    this.logger.log(`M10: processing USER_ACTIVATED — user_id=${event.user_id}`);
    try {
      await this.handler.handle(event);
    } catch (error) {
      this.logger.error(
        `M10: mission assignment failed for user_id=${event.user_id}: ${error.message}`,
        error.stack,
      );
    }
  }
}
