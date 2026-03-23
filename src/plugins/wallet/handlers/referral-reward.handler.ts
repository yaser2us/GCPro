import { Injectable, Logger } from '@nestjs/common';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { OutboxService } from '../../../corekit/services/outbox.service';

/**
 * ReferralRewardHandler — Phase 6 (Wallet plugin)
 *
 * Handles REFERRAL_REWARD_REQUESTED events.
 * Finds or creates a COIN wallet for the beneficiary, creates a wallet_deposit_intent,
 * and emits REFERRAL_REWARD_CREDITED.
 *
 * Cross-plugin reads:
 *  - person WHERE primary_user_id = beneficiary_user_id → account_person → account
 *
 * Idempotency: ON DUPLICATE KEY on idempotency_key in wallet_deposit_intent.
 * Auto-creates COIN wallet (wallet_type='MAIN', currency='COIN') if none found.
 */
@Injectable()
export class ReferralRewardHandler {
  private readonly logger = new Logger(ReferralRewardHandler.name);

  constructor(
    private readonly txService: TransactionService,
    private readonly outboxService: OutboxService,
  ) {}

  async handle(event: {
    grant_id: number | null;
    conversion_id: number;
    program_id: number;
    beneficiary_user_id: number;
    beneficiary_role: string;
    reward_type: string;
    amount: number;
    currency?: string;
    policy_id?: number | null;
    [key: string]: any;
  }): Promise<void> {
    const {
      grant_id,
      conversion_id,
      beneficiary_user_id,
      beneficiary_role,
      amount,
      currency = 'COIN',
    } = event;

    const numericAmount = Number(amount ?? 0);
    if (numericAmount <= 0) {
      this.logger.warn(`ReferralReward: skipping grant_id=${grant_id} — amount=${numericAmount}`);
      return;
    }

    const idempotencyKey = `ref_reward_credited_${grant_id ?? `${conversion_id}_${beneficiary_role}`}`;

    await this.txService.run(async (queryRunner) => {
      // Resolve account for beneficiary_user_id via person → account_person → account
      const accountRows = await queryRunner.manager.query(
        `SELECT a.id
         FROM account a
         JOIN account_person ap ON ap.account_id = a.id
         JOIN person p ON p.id = ap.person_id
         WHERE p.primary_user_id = ? AND a.type = 'user'
         LIMIT 1`,
        [beneficiary_user_id],
      );

      if (!accountRows?.length) {
        this.logger.warn(
          `ReferralReward: no account for user_id=${beneficiary_user_id}, grant_id=${grant_id} — skipping`,
        );
        return;
      }

      const accountId = Number(accountRows[0].id);

      // Find COIN wallet
      const walletRows = await queryRunner.manager.query(
        `SELECT id FROM wallet
         WHERE account_id = ? AND currency = 'COIN' AND wallet_type = 'MAIN' AND status = 'active'
         LIMIT 1`,
        [accountId],
      );

      let walletId: number;

      if (!walletRows?.length) {
        // Auto-create COIN wallet
        const createResult = await queryRunner.manager.query(
          `INSERT INTO wallet (account_id, wallet_type, currency, status, created_at, updated_at)
           VALUES (?, 'MAIN', 'COIN', 'active', NOW(), NOW())`,
          [accountId],
        );
        walletId = Number(createResult.insertId);

        // Seed balance snapshot
        await queryRunner.manager.query(
          `INSERT INTO wallet_balance_snapshot (wallet_id, available_amount, held_amount, total_amount, currency, as_of, updated_at)
           VALUES (?, 0, 0, 0, 'COIN', NOW(), NOW())`,
          [walletId],
        );

        this.logger.log(`ReferralReward: auto-created COIN wallet wallet_id=${walletId} for account_id=${accountId}`);
      } else {
        walletId = Number(walletRows[0].id);
      }

      // Create wallet_deposit_intent (idempotent)
      await queryRunner.manager.query(
        `INSERT INTO wallet_deposit_intent
           (wallet_id, account_id, amount, currency, status,
            ref_type, ref_id, idempotency_key, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'created', 'referral_reward_grant', ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
        [walletId, accountId, numericAmount, currency, String(grant_id ?? `${conversion_id}_${beneficiary_role}`), idempotencyKey],
      );

      const [intentRow] = await queryRunner.manager.query(
        `SELECT id FROM wallet_deposit_intent WHERE idempotency_key = ? LIMIT 1`,
        [idempotencyKey],
      );

      this.logger.log(
        `ReferralReward: deposit_intent created — wallet_id=${walletId}, amount=${numericAmount} ${currency}, grant_id=${grant_id}, intent_id=${intentRow?.id}`,
      );

      await this.outboxService.enqueue(
        {
          event_name: 'REFERRAL_REWARD_CREDITED',
          event_version: 1,
          aggregate_type: 'WALLET',
          aggregate_id: String(walletId),
          actor_user_id: String(beneficiary_user_id),
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: `ref_reward_grant_${grant_id ?? conversion_id}`,
          payload: {
            grant_id: grant_id ?? null,
            conversion_id,
            wallet_id: walletId,
            account_id: accountId,
            beneficiary_user_id,
            beneficiary_role,
            amount: numericAmount,
            currency,
            deposit_intent_id: intentRow?.id ?? null,
          },
        },
        queryRunner,
      );
    });
  }
}
