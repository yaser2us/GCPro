import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../../corekit/services/event-bus.service';
import { UserLoggedInHandler } from '../handlers/user-logged-in.handler';

/**
 * UserLoggedInConsumer — Phase 9D
 *
 * Subscribes to USER_LOGGED_IN events from the identity plugin and sends
 * an optional login alert notification.
 * Fire-and-forget: errors are logged but do not block the login flow.
 *
 * Source: specs/identity/identity.pillar.v2.yml — integration.notification
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
    this.logger.log(
      'Phase 9D: Registered for USER_LOGGED_IN events (login alert)',
    );
  }

  async onUserLoggedIn(event: any): Promise<void> {
    this.logger.log(
      `Phase 9D: processing USER_LOGGED_IN — user_id=${event.user_id}, platform=${event.platform}`,
    );
    try {
      await this.handler.handle(event);
    } catch (error) {
      this.logger.error(
        `Phase 9D: login alert notification failed for user_id=${event.user_id}: ${error.message}`,
        error.stack,
      );
    }
  }
}
