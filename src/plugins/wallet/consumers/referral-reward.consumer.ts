import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../../corekit/services/event-bus.service';
import { ReferralRewardHandler } from '../handlers/referral-reward.handler';

/**
 * ReferralRewardConsumer — Phase 6 (Wallet plugin)
 *
 * Subscribes to REFERRAL_REWARD_REQUESTED events and triggers COIN wallet deposit intent creation.
 * Fire-and-forget: errors logged but do not block the referral reward flow.
 */
@Injectable()
export class ReferralRewardConsumer implements OnModuleInit {
  private readonly logger = new Logger(ReferralRewardConsumer.name);

  constructor(
    private readonly handler: ReferralRewardHandler,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('REFERRAL_REWARD_REQUESTED', this.onReferralRewardRequested.bind(this));
    this.logger.log('Phase 6: Registered for REFERRAL_REWARD_REQUESTED events (COIN wallet credit)');
  }

  async onReferralRewardRequested(event: any): Promise<void> {
    this.logger.log(
      `Phase 6: processing REFERRAL_REWARD_REQUESTED — grant_id=${event.grant_id}, user_id=${event.beneficiary_user_id}, role=${event.beneficiary_role}`,
    );
    try {
      await this.handler.handle(event);
    } catch (error) {
      this.logger.error(
        `Phase 6: referral wallet credit failed for grant_id=${event.grant_id}: ${error.message}`,
        error.stack,
      );
    }
  }
}
