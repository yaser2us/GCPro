import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../../corekit/services/event-bus.service';
import { KycVerifiedHandler } from '../handlers/kyc-verified.handler';

/**
 * KycVerifiedConsumer (identity plugin)
 * Subscribes to KYC_VERIFIED events from Foundation pillar.
 * Delegates to KycVerifiedHandler → upserts verification_status.
 * Source: specs/identity/identity.pillar.v2.yml — integration.foundation.consumers[KYC_VERIFIED]
 */
@Injectable()
export class KycVerifiedConsumer implements OnModuleInit {
  private readonly logger = new Logger(KycVerifiedConsumer.name);

  constructor(
    private readonly handler: KycVerifiedHandler,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('KYC_VERIFIED', this.handleKycVerified.bind(this));
    this.logger.log('Registered for KYC_VERIFIED events');
  }

  async handleKycVerified(event: {
    kyc_id: number;
    subject_type: string;
    subject_id: number;
    provider: string;
  }): Promise<void> {
    this.logger.log(
      `Processing KYC_VERIFIED: kyc_id=${event.kyc_id}, subject_id=${event.subject_id}`,
    );

    try {
      const result = await this.handler.handle(event);
      this.logger.log(
        `KYC_VERIFIED processed: account_id=${result.account_id}, status=${result.status}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process KYC_VERIFIED: kyc_id=${event.kyc_id}, error=${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
