import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MissionRewardHandler } from '../handlers/mission-reward.handler';
import { EventBusService } from '../../../corekit/services/event-bus.service';

/**
 * Mission Reward Event Consumer
 * Listens to MISSION_REWARD_REQUESTED events and credits wallet
 *
 * Based on specs/wallet/wallet.pillar.v2.yml lines 976-1128
 *
 * Event: MISSION_REWARD_REQUESTED (emitted by missions plugin)
 * Source: missions plugin
 * Handler: MissionRewardHandler
 *
 * Architecture:
 * - Consumer (this file): Thin routing layer, registers for events
 * - Handler (mission-reward.handler.ts): Business logic for mission rewards
 * - Shared Services: WalletService, LedgerService, BalanceService
 */
@Injectable()
export class MissionRewardConsumer implements OnModuleInit {
  private readonly logger = new Logger(MissionRewardConsumer.name);

  constructor(
    private readonly handler: MissionRewardHandler,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Register event handler on module initialization
   */
  onModuleInit() {
    this.eventBus.subscribe(
      'MISSION_REWARD_REQUESTED',
      this.handleMissionRewardRequested.bind(this),
    );
    this.logger.log('✅ Registered for MISSION_REWARD_REQUESTED events');
  }

  /**
   * Handle MISSION_REWARD_REQUESTED event
   *
   * Event payload:
   * - reward_grant_id: ID of the reward grant
   * - assignment_id: ID of the mission assignment
   * - user_id: ID of the user who completed the mission
   *
   * This method is called by the outbox event processor when a
   * MISSION_REWARD_REQUESTED event is published by the missions plugin.
   *
   * Flow:
   * 1. Receive event from EventBus
   * 2. Delegate to MissionRewardHandler
   * 3. Log success or failure
   *
   * Idempotency:
   * - Handled by handler via ledger_txn.idempotency_key
   * - Safe to retry on failure
   */
  async handleMissionRewardRequested(event: {
    reward_grant_id: number;
    assignment_id: number;
    user_id: number;
  }): Promise<void> {
    this.logger.log(
      `Processing MISSION_REWARD_REQUESTED event: reward_grant_id=${event.reward_grant_id}, user_id=${event.user_id}`,
    );

    try {
      // Delegate to handler (business logic lives there)
      const result = await this.handler.handle(event);

      if (result.already_processed) {
        this.logger.log(
          `Reward already processed: reward_grant_id=${event.reward_grant_id}, ledger_txn_id=${result.ledger_txn_id}`,
        );
      } else {
        this.logger.log(
          `Reward processed successfully: reward_grant_id=${event.reward_grant_id}, ledger_txn_id=${result.ledger_txn_id}, new_balance=${result.new_balance}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to process mission reward: reward_grant_id=${event.reward_grant_id}, error=${error.message}`,
        error.stack,
      );
      throw error; // Re-throw to allow retry by outbox processor
    }
  }

}
