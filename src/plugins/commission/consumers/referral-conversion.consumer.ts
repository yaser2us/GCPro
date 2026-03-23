import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../../corekit/services/event-bus.service';
import { ReferralConversionHandler } from '../handlers/referral-conversion.handler';

/**
 * ReferralConversionConsumer — Phase 7A (Commission plugin)
 *
 * Subscribes to REFERRAL_CONVERSION_CREATED and triggers multi-level
 * commission accrual recording for all ancestors in the referral chain.
 * Fire-and-forget: errors logged but do not block the referral conversion flow.
 *
 * Source: specs/commission/commission.pillar.v2.yml integration.referral_pillar
 */
@Injectable()
export class ReferralConversionConsumer implements OnModuleInit {
  private readonly logger = new Logger(ReferralConversionConsumer.name);

  constructor(
    private readonly handler: ReferralConversionHandler,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe(
      'REFERRAL_CONVERSION_CREATED',
      this.onReferralConversionCreated.bind(this),
    );
    this.logger.log('Phase 7A: Registered for REFERRAL_CONVERSION_CREATED events (commission accruals)');
  }

  async onReferralConversionCreated(event: any): Promise<void> {
    this.logger.log(
      `Phase 7A: processing REFERRAL_CONVERSION_CREATED — conversion_id=${event.conversion_id}, referred_user_id=${event.referred_user_id}`,
    );
    try {
      await this.handler.handle(event);
    } catch (error) {
      this.logger.error(
        `Phase 7A: commission accrual failed for conversion_id=${event.conversion_id}: ${error.message}`,
        error.stack,
      );
    }
  }
}
