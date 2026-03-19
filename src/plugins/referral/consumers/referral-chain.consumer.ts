import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ReferralChainService } from '../services/referral-chain.service';
import { EventBusService } from '../../../corekit/services/event-bus.service';
import { TransactionService } from '../../../corekit/services/transaction.service';

/**
 * Referral Chain Event Consumer (V2 Only)
 * Listens to REFERRAL_CONVERSION_CREATED events and builds multi-level chains
 *
 * This consumer is only registered when using V2 multi-level referrals.
 * V1 referral module does NOT include this consumer.
 *
 * Event: REFERRAL_CONVERSION_CREATED (emitted by ReferralWorkflowService)
 * Source: V1 or V2 workflow service
 * Handler: ReferralChainService.buildChain()
 *
 * Architecture:
 * - V1 Module: Does NOT register this consumer (single-level only)
 * - V2 Module: Registers this consumer (multi-level enabled)
 * - Both modules share the same workflow service
 * - V2 functionality is enabled purely by event consumption
 */
@Injectable()
export class ReferralChainConsumer implements OnModuleInit {
  private readonly logger = new Logger(ReferralChainConsumer.name);

  constructor(
    private readonly chainService: ReferralChainService,
    private readonly eventBus: EventBusService,
    private readonly txService: TransactionService,
  ) {}

  /**
   * Register event handler on module initialization
   */
  onModuleInit() {
    this.eventBus.subscribe(
      'REFERRAL_CONVERSION_CREATED',
      this.handleConversionCreated.bind(this),
    );
    this.logger.log('✅ V2 Multi-Level Referrals Enabled - Registered for REFERRAL_CONVERSION_CREATED events');
  }

  /**
   * Handle REFERRAL_CONVERSION_CREATED event
   *
   * Event payload:
   * - conversion_id: ID of the referral conversion
   * - program_id: Referral program ID
   * - invite_id: Invite ID that led to conversion
   * - referrer_user_id: User who referred
   * - referred_user_id: User who was referred
   *
   * This method builds the multi-level referral chain:
   * 1. Creates direct relationship (referrer → referred, depth=1)
   * 2. Creates indirect relationships (ancestors → referred, depth=2+)
   *
   * Example:
   *   Existing: User A → User B
   *   New conversion: User B → User C
   *   Creates:
   *     - User B → User C (depth=1)
   *     - User A → User C (depth=2)
   *
   * Idempotency:
   * - Chain entries have unique constraint on (program_id, ancestor, descendant)
   * - Safe to retry on failure
   */
  async handleConversionCreated(event: {
    conversion_id: number;
    program_id: number;
    invite_id: number;
    referrer_user_id: number;
    referred_user_id: number;
  }): Promise<void> {
    this.logger.log(
      `[V2] Processing REFERRAL_CONVERSION_CREATED: conversion_id=${event.conversion_id}, referrer=${event.referrer_user_id} → referred=${event.referred_user_id}`,
    );

    try {
      // Build chain in a separate transaction
      // (The conversion was already committed by the workflow service)
      await this.txService.run(async (queryRunner) => {
        await this.chainService.buildChain(event.conversion_id, queryRunner);
      });

      this.logger.log(
        `[V2] Multi-level chain built successfully for conversion_id=${event.conversion_id}`,
      );
    } catch (error) {
      this.logger.error(
        `[V2] Failed to build chain for conversion_id=${event.conversion_id}: ${error.message}`,
        error.stack,
      );
      // Don't throw - chain building failure shouldn't break the conversion
      // Can be retried later or rebuilt manually
    }
  }
}
