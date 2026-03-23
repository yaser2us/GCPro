import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../../corekit/services/event-bus.service';
import { PersonCreatedHandler } from '../handlers/person-created.handler';

/**
 * PersonCreatedConsumer — C5 Wallet Auto-Init
 *
 * Subscribes to PERSON_CREATED events and delegates to PersonCreatedHandler.
 *
 * Based on: api-build-plan.md C5 + specs/wallet/wallet.pillar.v2.yml
 */
@Injectable()
export class PersonCreatedConsumer implements OnModuleInit {
  private readonly logger = new Logger(PersonCreatedConsumer.name);

  constructor(
    private readonly handler: PersonCreatedHandler,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('PERSON_CREATED', this.handlePersonCreated.bind(this));
    this.logger.log('✅ Registered for PERSON_CREATED events');
  }

  async handlePersonCreated(event: {
    person_id: number;
    type: string;
    full_name: string;
  }): Promise<void> {
    this.logger.log(`Processing PERSON_CREATED event: person_id=${event.person_id}`);

    try {
      await this.handler.handle(event);
    } catch (error) {
      this.logger.error(
        `Failed wallet auto-init for person_id=${event.person_id}: ${error.message}`,
        error.stack,
      );
      throw error; // Re-throw to allow retry by outbox processor
    }
  }
}
