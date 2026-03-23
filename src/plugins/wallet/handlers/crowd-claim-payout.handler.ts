import { Injectable, Logger } from '@nestjs/common';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { OutboxService } from '../../../corekit/services/outbox.service';

/**
 * CrowdClaimPayoutHandler — Phase 7C (Wallet plugin)
 *
 * Handles CROWD_CLAIM_PAYOUT_PAID events from the crowd plugin.
 * Resolves the claimant's GC_WALLET and creates a wallet_deposit_intent for
 * the payout amount. Emits CROWD_PAYOUT_WALLET_CREDITED.
 *
 * Cross-plugin reads (raw SQL — no TypeORM cross-module dependency):
 *   crowd_claim_payout → payout record (amount, crowd_period_claim_id)
 *   crowd_period_claim → claim_id, approved_amount_snapshot
 *   claim_case         → account_id of the claimant
 *
 * Fallback: if crowd_claim_payout has insufficient info, resolves via claim_case.
 *
 * Idempotency: ON DUPLICATE KEY on idempotency_key in wallet_deposit_intent.
 *
 * Source: specs/crowd/crowd.pillar.v2.yml CROWD_CLAIM_PAYOUT_PAID
 */
@Injectable()
export class CrowdClaimPayoutHandler {
  private readonly logger = new Logger(CrowdClaimPayoutHandler.name);

  constructor(
    private readonly txService: TransactionService,
    private readonly outboxService: OutboxService,
  ) {}

  async handle(event: {
    payout_id: number;
    status?: string;
    payout_ref?: string | null;
    ledger_txn_id?: number | null;
    [key: string]: any;
  }): Promise<void> {
    const payoutId = Number(event.payout_id);
    const idempotencyKey = `crowd_claim_payout_${payoutId}`;

    await this.txService.run(async (queryRunner) => {
      // Load payout record (cross-plugin raw SQL)
      const [payoutRow] = await queryRunner.manager.query(
        `SELECT ccp.id, ccp.amount, ccp.crowd_period_claim_id
         FROM crowd_claim_payout ccp
         WHERE ccp.id = ?
         LIMIT 1`,
        [payoutId],
      );

      if (!payoutRow) {
        this.logger.error(
          `CrowdClaimPayout: crowd_claim_payout not found for payout_id=${payoutId}`,
        );
        return;
      }

      const amount = Number(payoutRow.amount);
      if (amount <= 0) {
        this.logger.warn(
          `CrowdClaimPayout: payout_id=${payoutId} has amount=${amount}, skipping`,
        );
        return;
      }

      // Resolve account_id via crowd_period_claim → claim_case
      const [periodClaimRow] = await queryRunner.manager.query(
        `SELECT cpc.claim_id
         FROM crowd_period_claim cpc
         WHERE cpc.id = ?
         LIMIT 1`,
        [payoutRow.crowd_period_claim_id],
      );

      if (!periodClaimRow) {
        this.logger.error(
          `CrowdClaimPayout: crowd_period_claim not found for crowd_period_claim_id=${payoutRow.crowd_period_claim_id}`,
        );
        return;
      }

      const [claimRow] = await queryRunner.manager.query(
        `SELECT account_id FROM claim_case WHERE id = ? LIMIT 1`,
        [periodClaimRow.claim_id],
      );

      if (!claimRow) {
        this.logger.error(
          `CrowdClaimPayout: claim_case not found for claim_id=${periodClaimRow.claim_id}`,
        );
        return;
      }

      const accountId = Number(claimRow.account_id);

      // Find claimant's GC_WALLET (MYR)
      const [walletRow] = await queryRunner.manager.query(
        `SELECT id FROM wallet
         WHERE account_id = ? AND wallet_type = 'GC_WALLET' AND currency = 'MYR' AND status = 'active'
         LIMIT 1`,
        [accountId],
      );

      if (!walletRow) {
        this.logger.warn(
          `CrowdClaimPayout: no GC_WALLET (MYR) for account_id=${accountId}, payout_id=${payoutId} — skipping wallet credit`,
        );
        return;
      }

      const walletId = Number(walletRow.id);

      // Create wallet_deposit_intent (idempotent)
      await queryRunner.manager.query(
        `INSERT INTO wallet_deposit_intent
           (wallet_id, account_id, amount, currency, status,
            ref_type, ref_id, idempotency_key, created_at, updated_at)
         VALUES (?, ?, ?, 'MYR', 'created', 'crowd_claim_payout', ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
        [walletId, accountId, amount, String(payoutId), idempotencyKey],
      );

      const [intentRow] = await queryRunner.manager.query(
        `SELECT id FROM wallet_deposit_intent WHERE idempotency_key = ? LIMIT 1`,
        [idempotencyKey],
      );

      this.logger.log(
        `CrowdClaimPayout: deposit_intent created — wallet_id=${walletId}, amount=${amount} MYR, payout_id=${payoutId}, intent_id=${intentRow?.id}`,
      );

      await this.outboxService.enqueue(
        {
          event_name: 'CROWD_PAYOUT_WALLET_CREDITED',
          event_version: 1,
          aggregate_type: 'WALLET',
          aggregate_id: String(walletId),
          actor_user_id: '0',
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: `crowd_claim_payout_paid_${payoutId}`,
          payload: {
            payout_id: payoutId,
            claim_id: periodClaimRow.claim_id,
            wallet_id: walletId,
            account_id: accountId,
            amount,
            deposit_intent_id: intentRow?.id ?? null,
          },
        },
        queryRunner,
      );
    });
  }
}
