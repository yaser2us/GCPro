import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../../corekit/services/event-bus.service';
import { RegistrationTokenIssuedHandler } from '../handlers/registration-token-issued.handler';

/**
 * RegistrationTokenIssuedConsumer — Phase 9C
 *
 * Subscribes to REGISTRATION_TOKEN_ISSUED events from the identity plugin
 * and delivers the OTP or magic-link to the user via their specified channel.
 * Fire-and-forget: errors are logged but do not block the registration flow.
 *
 * Source: specs/identity/identity.pillar.v2.yml — integration.notification
 */
@Injectable()
export class RegistrationTokenIssuedConsumer implements OnModuleInit {
  private readonly logger = new Logger(RegistrationTokenIssuedConsumer.name);

  constructor(
    private readonly handler: RegistrationTokenIssuedHandler,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe(
      'REGISTRATION_TOKEN_ISSUED',
      this.onRegistrationTokenIssued.bind(this),
    );
    this.logger.log(
      'Phase 9C: Registered for REGISTRATION_TOKEN_ISSUED events (OTP delivery)',
    );
  }

  async onRegistrationTokenIssued(event: any): Promise<void> {
    this.logger.log(
      `Phase 9C: processing REGISTRATION_TOKEN_ISSUED — ` +
      `registration_token_id=${event.registration_token_id}, ` +
      `channel=${event.channel_type}, purpose=${event.purpose}`,
    );
    try {
      await this.handler.handle(event);
    } catch (error) {
      this.logger.error(
        `Phase 9C: OTP notification failed for registration_token_id=${event.registration_token_id}: ${error.message}`,
        error.stack,
      );
    }
  }
}
