import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { UserLoggedInHandler } from '../handlers/user-logged-in.handler';
import { EventBusService } from '../../../corekit/services/event-bus.service';

/**
 * UserLoggedInConsumer — M10
 *
 * Subscribes to USER_LOGGED_IN events and increments login metric progress
 * for active streak mission assignments.
 * Fire-and-forget: errors are logged but do not block the login flow.
 */
@Injectable()
export class UserLoggedInConsumer implements OnModuleInit {
  private readonly logger = new Logger(UserLoggedInConsumer.name);

  constructor(
    private readonly handler: UserLoggedInHandler,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('USER_LOGGED_IN', this.onUserLoggedIn.bind(this));
    this.logger.log('Registered for USER_LOGGED_IN events');
  }

  async onUserLoggedIn(event: { user_id: number; [key: string]: any }): Promise<void> {
    this.logger.log(`M10: processing USER_LOGGED_IN — user_id=${event.user_id}`);
    try {
      await this.handler.handle(event);
    } catch (error) {
      this.logger.error(
        `M10: login streak increment failed for user_id=${event.user_id}: ${error.message}`,
        error.stack,
      );
    }
  }
}
