import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { OutboxService } from '../../../corekit/services/outbox.service';
import { WalletService } from '../services/wallet.service';
import { LedgerService } from '../services/ledger.service';
import { BalanceService } from '../services/balance.service';

/**
 * Mission Reward Handler
 *
 * Handles MISSION_REWARD_REQUESTED events from the missions pillar
 *
 * Scope: Single responsibility - only processes mission rewards
 * Reuses: Shared services (WalletService, LedgerService, BalanceService)
 *
 * Flow:
 * 1. Validate reward_grant from missions plugin
 * 2. Get or create account and wallet for user
 * 3. Check idempotency (prevent duplicate processing)
 * 4. Create ledger transaction with double-entry
 * 5. Credit wallet balance
 * 6. Update reward_grant status to 'granted'
 * 7. Emit WALLET_CREDITED event
 *
 * Based on: specs/wallet/wallet.pillar.v2.yml lines 976-1128
 */
@Injectable()
export class MissionRewardHandler {
  constructor(
    private readonly txService: TransactionService,
    private readonly walletService: WalletService,
    private readonly ledgerService: LedgerService,
    private readonly balanceService: BalanceService,
    private readonly outboxService: OutboxService,
  ) {}

  /**
   * Handle mission reward event
   *
   * @param event - Event payload from missions pillar
   * @returns Result with ledger_txn_id and new_balance
   */
  async handle(event: {
    reward_grant_id: number;
    assignment_id: number;
    user_id: number;
  }): Promise<{
    ledger_txn_id: number;
    new_balance: string;
    already_processed?: boolean;
  }> {
    const result = await this.txService.run(async (queryRunner) => {
      const { reward_grant_id, assignment_id, user_id } = event;

      // === STEP 1: Validate reward_grant from missions plugin ===
      const reward_grant = await this.fetchAndValidateRewardGrant(
        reward_grant_id,
        user_id,
        queryRunner,
      );

      // === STEP 2: Get or create account and wallet for user ===
      const { account, wallet } = await this.walletService.findOrCreateUserWallet(
        user_id,
        'COIN',  // Currency
        'MAIN',  // Wallet type
        queryRunner,
      );

      // === STEP 3: Check idempotency (prevent duplicate processing) ===
      const idempotency_key = `mission_reward_${reward_grant_id}`;
      const existingTxn = await this.ledgerService.findByIdempotencyKey(
        idempotency_key,
        queryRunner,
      );

      if (existingTxn) {
        // Already processed, return early with current balance
        const currentBalance = await this.balanceService.getBalance(
          wallet.id,
          queryRunner,
        );

        return {
          ledger_txn_id: existingTxn.id,
          new_balance: currentBalance?.total_amount || '0.00',
          already_processed: true,
        };
      }

      // === STEP 4: Create ledger transaction with double-entry ===
      const ledger_txn_id = await this.ledgerService.createCreditTransaction(
        {
          account_id: account.id,
          type: 'mission_reward',
          amount: String(reward_grant.amount),
          currency: 'COIN',
          ref_type: 'mission_reward_grant',
          ref_id: String(reward_grant_id),
          idempotency_key,
          meta_json: {
            assignment_id,
            user_id,
          },
        },
        queryRunner,
      );

      // === STEP 5: Credit wallet balance ===
      const new_balance = await this.balanceService.creditBalance(
        wallet.id,
        String(reward_grant.amount),
        queryRunner,
      );

      // === STEP 6: Update reward_grant status to 'granted' ===
      await this.updateRewardGrantStatus(
        reward_grant_id,
        ledger_txn_id,
        queryRunner,
      );

      // === STEP 7: Emit WALLET_CREDITED event ===
      await this.outboxService.enqueue(
        {
          event_name: 'WALLET_CREDITED',
          event_version: 1,
          aggregate_type: 'WALLET',
          aggregate_id: String(wallet.id),
          actor_user_id: String(user_id),
          occurred_at: new Date(),
          correlation_id: `mission-reward-${reward_grant_id}-${Date.now()}`,
          causation_id: `event-mission-reward-requested-${reward_grant_id}`,
          payload: {
            wallet_id: wallet.id,
            ledger_txn_id,
            amount: Number(reward_grant.amount),
            currency: 'COIN',
            new_balance,
            source: 'mission_reward',
            source_id: reward_grant_id,
          },
        },
        queryRunner,
      );

      return {
        ledger_txn_id,
        new_balance,
        already_processed: false,
      };
    });

    return result;
  }

  /**
   * Fetch and validate reward_grant from missions plugin
   *
   * Validates:
   * - Reward grant exists
   * - User ID matches
   * - Amount is positive
   * - Reward type is 'coins'
   * - Currency is 'COIN'
   * - Status is 'requested'
   *
   * @param reward_grant_id - Reward grant ID
   * @param user_id - Expected user ID
   * @param queryRunner - Transaction context
   * @returns Validated reward_grant record
   * @throws NotFoundException if reward_grant not found
   * @throws ConflictException if validation fails
   */
  private async fetchAndValidateRewardGrant(
    reward_grant_id: number,
    user_id: number,
    queryRunner: QueryRunner,
  ): Promise<any> {
    // Fetch reward_grant from missions plugin table
    const rewardGrantResult = await queryRunner.manager.query(
      `SELECT * FROM mission_reward_grant WHERE id = ?`,
      [reward_grant_id],
    );
    const reward_grant = rewardGrantResult[0];

    // Guard: reward_grant exists
    if (!reward_grant) {
      throw new NotFoundException({
        code: 'REWARD_GRANT_NOT_FOUND',
        message: `Reward grant ${reward_grant_id} not found`,
      });
    }

    // Guard: user_id matches
    if (reward_grant.user_id !== user_id) {
      throw new ConflictException({
        code: 'REWARD_GRANT_USER_MISMATCH',
        message: `Reward grant user_id ${reward_grant.user_id} does not match event user_id ${user_id}`,
      });
    }

    // Guard: amount is positive
    if (Number(reward_grant.amount) <= 0) {
      throw new BadRequestException({
        code: 'INVALID_REWARD_AMOUNT',
        message: `Reward amount must be greater than 0, got ${reward_grant.amount}`,
      });
    }

    // Guard: reward_type is 'coins'
    if (reward_grant.reward_type !== 'coins') {
      throw new BadRequestException({
        code: 'UNSUPPORTED_REWARD_TYPE',
        message: `Only 'coins' reward type is supported, got ${reward_grant.reward_type}`,
      });
    }

    // Guard: currency is 'COIN'
    if (reward_grant.currency !== 'COIN') {
      throw new BadRequestException({
        code: 'UNSUPPORTED_CURRENCY',
        message: `Only 'COIN' currency is supported, got ${reward_grant.currency}`,
      });
    }

    // Guard: status is 'requested'
    if (reward_grant.status !== 'requested') {
      throw new ConflictException({
        code: 'REWARD_NOT_REQUESTED',
        message: `Reward status is ${reward_grant.status}, expected 'requested'`,
      });
    }

    return reward_grant;
  }

  /**
   * Update reward_grant status and link to ledger transaction
   *
   * Updates missions plugin table:
   * - Sets status to 'granted'
   * - Links to ledger_txn via ref_type and ref_id
   *
   * @param reward_grant_id - Reward grant ID
   * @param ledger_txn_id - Ledger transaction ID
   * @param queryRunner - Transaction context
   */
  private async updateRewardGrantStatus(
    reward_grant_id: number,
    ledger_txn_id: number,
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.manager.query(
      `
      UPDATE mission_reward_grant
      SET ref_type = ?, ref_id = ?, status = ?
      WHERE id = ?
      `,
      ['ledger_txn', String(ledger_txn_id), 'granted', reward_grant_id],
    );
  }
}
