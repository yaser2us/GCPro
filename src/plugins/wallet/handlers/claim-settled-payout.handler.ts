import { Injectable, Logger } from '@nestjs/common';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { OutboxService } from '../../../corekit/services/outbox.service';

/**
 * ClaimSettledPayoutHandler — Phase 5
 *
 * Handles CLAIM_SETTLED events with approved_amount > 0.
 * Creates a wallet_deposit_intent to credit the claimant's GC Wallet.
 *
 * Cross-plugin reads:
 *  - claim_case.account_id → account to credit
 *  - wallet (GC_WALLET, MYR, active) → deposit target
 *
 * Idempotency: ON DUPLICATE KEY on idempotency_key.
 * If no GC Wallet exists for the account, logs warning and skips
 * (the settlement is still valid; payout will be handled via external channel).
 */
@Injectable()
export class ClaimSettledPayoutHandler {
  private readonly logger = new Logger(ClaimSettledPayoutHandler.name);

  constructor(
    private readonly txService: TransactionService,
    private readonly outboxService: OutboxService,
  ) {}

  async handle(event: {
    claim_id: number;
    claim_number?: string;
    approved_amount: number;
    policy_id?: number | null;
    [key: string]: any;
  }): Promise<void> {
    const approvedAmount = Number(event.approved_amount ?? 0);
    if (approvedAmount <= 0) {
      this.logger.log(`ClaimSettledPayout: skipping claim_id=${event.claim_id} — approved_amount=${approvedAmount}`);
      return;
    }

    const idempotencyKey = `claim_settled_payout_${event.claim_id}`;

    await this.txService.run(async (queryRunner) => {
      // Resolve account_id from claim_case (cross-plugin read)
      const [claimRow] = await queryRunner.manager.query(
        `SELECT account_id FROM claim_case WHERE id = ? LIMIT 1`,
        [event.claim_id],
      );

      if (!claimRow) {
        this.logger.error(`ClaimSettledPayout: claim_case not found for claim_id=${event.claim_id}`);
        return;
      }

      const accountId = Number(claimRow.account_id);

      // Find the claimant's GC Wallet (MYR) for credit
      const [wallet] = await queryRunner.manager.query(
        `SELECT id FROM wallet
         WHERE account_id = ? AND wallet_type = 'GC_WALLET' AND currency = 'MYR' AND status = 'active'
         LIMIT 1`,
        [accountId],
      );

      if (!wallet) {
        this.logger.warn(
          `ClaimSettledPayout: no GC_WALLET (MYR) for account_id=${accountId}, claim_id=${event.claim_id} — skipping wallet credit`,
        );
        return;
      }

      const walletId = Number(wallet.id);

      // Create wallet_deposit_intent (idempotent)
      await queryRunner.manager.query(
        `INSERT INTO wallet_deposit_intent
           (wallet_id, account_id, amount, currency, status,
            ref_type, ref_id, idempotency_key, created_at, updated_at)
         VALUES (?, ?, ?, 'MYR', 'created', 'claim_case', ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
        [walletId, accountId, approvedAmount, String(event.claim_id), idempotencyKey],
      );

      const [intentRow] = await queryRunner.manager.query(
        `SELECT id FROM wallet_deposit_intent WHERE idempotency_key = ? LIMIT 1`,
        [idempotencyKey],
      );

      this.logger.log(
        `ClaimSettledPayout: deposit_intent created — wallet_id=${walletId}, amount=${approvedAmount}, intent_id=${intentRow?.id}`,
      );

      await this.outboxService.enqueue(
        {
          event_name: 'CLAIM_PAYOUT_INITIATED',
          event_version: 1,
          aggregate_type: 'WALLET',
          aggregate_id: String(walletId),
          actor_user_id: '0',
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: `claim_settled_${event.claim_id}`,
          payload: {
            claim_id: event.claim_id,
            claim_number: event.claim_number ?? null,
            policy_id: event.policy_id ?? null,
            wallet_id: walletId,
            account_id: accountId,
            amount: approvedAmount,
            deposit_intent_id: intentRow?.id ?? null,
          },
        },
        queryRunner,
      );
    });
  }
}
