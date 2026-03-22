import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { KycVerifiedHandler } from '../handlers/kyc-verified.handler';
import { EventBusService } from '../../../corekit/services/event-bus.service';

/**
 * KYC Verified Event Consumer
 * Listens to KYC_VERIFIED events from the foundation pillar and updates
 * verification status in the user-identity plugin.
 *
 * Events Consumed:
 * 1. KYC_VERIFIED (emitted by foundation/kyc plugin)
 *
 * Source: foundation plugin
 * Handler: KycVerifiedHandler
 *
 * Architecture:
 * - Consumer (this file): Thin routing layer, registers for events
 * - Handler (kyc-verified.handler.ts): Business logic for verification status update
 *
 * Flow:
 * 1. Foundation plugin completes KYC → KYC_VERIFIED event
 * 2. OutboxPublisher publishes event to EventBus
 * 3. This consumer receives event and delegates to handler
 * 4. Handler upserts verification_status record with type='kyc', status='verified'
 */
@Injectable()
export class KycVerifiedConsumer implements OnModuleInit {
  private readonly logger = new Logger(KycVerifiedConsumer.name);

  constructor(
    private readonly handler: KycVerifiedHandler,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Register event handlers on module initialization
   */
  onModuleInit() {
    this.eventBus.subscribe(
      'KYC_VERIFIED',
      this.handleKycVerified.bind(this),
    );
    this.logger.log('Registered for KYC_VERIFIED events');
  }

  /**
   * Handle KYC_VERIFIED event - upsert verification status
   *
   * Event payload:
   * - kyc_id: ID of the KYC record
   * - subject_type: 'person' or 'account'
   * - subject_id: the person_id or account_id
   * - provider: KYC provider name
   */
  async handleKycVerified(event: {
    kyc_id: number;
    subject_type: string;
    subject_id: number;
    provider: string;
  }): Promise<void> {
    this.logger.log(
      `Processing KYC_VERIFIED event: kyc_id=${event.kyc_id}, subject_type=${event.subject_type}, subject_id=${event.subject_id}`,
    );

    try {
      const result = await this.handler.handle(event);

      this.logger.log(
        `KYC verification status updated: kyc_id=${event.kyc_id}, account_id=${result.account_id}, type=${result.type}, status=${result.status}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process KYC verified event: kyc_id=${event.kyc_id}, error=${error.message}`,
        error.stack,
      );
      throw error; // Re-throw to allow retry by outbox processor
    }
  }
}
