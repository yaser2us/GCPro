import { Injectable, Logger } from '@nestjs/common';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { OutboxService } from '../../../corekit/services/outbox.service';
import { LedgerService } from '../services/ledger.service';
import { BalanceService } from '../services/balance.service';

/**
 * CommissionPayoutHandler — Phase 7B (Wallet plugin)
 *
 * Handles PAYOUT_BATCH_COMPLETED events from the commission plugin.
 * For each payout_item in the batch with payout_method='wallet', creates a
 * debit ledger transaction to mark the commission as having been disbursed.
 * Emits COMMISSION_PAYOUT_DEBITED per item.
 *
 * Cross-plugin reads:
 *   commission_payout_item — raw SQL (no TypeORM cross-module dependency)
 *   commission_participant  — raw SQL (to get wallet_id)
 *
 * Idempotency: unique idempotency_key per batch_item in ledger_txn.
 *
 * Source: specs/commission/commission.pillar.v2.yml integration.wallet_pillar.PAYOUT_BATCH_COMPLETED
 */
@Injectable()
export class CommissionPayoutHandler {
  private readonly logger = new Logger(CommissionPayoutHandler.name);

  constructor(
    private readonly txService: TransactionService,
    private readonly ledgerService: LedgerService,
    private readonly balanceService: BalanceService,
    private readonly outboxService: OutboxService,
  ) {}

  async handle(event: {
    batch_id: number;
    program_id?: number;
    total_amount?: number;
    item_count?: number;
    [key: string]: any;
  }): Promise<void> {
    const batchId = Number(event.batch_id);

    await this.txService.run(async (queryRunner) => {
      // Fetch all wallet-payout items in this batch (cross-plugin raw SQL)
      const itemRows: Array<{
        item_id: number;
        participant_id: number;
        amount: string;
        currency: string;
        wallet_id: number | null;
      }> = await queryRunner.manager.query(
        `SELECT cpi.id AS item_id, cpi.participant_id, cpi.amount, cpi.currency,
                cp.wallet_id
         FROM commission_payout_item cpi
         JOIN commission_participant cp ON cp.id = cpi.participant_id
         WHERE cpi.batch_id = ?
           AND cpi.payout_method = 'wallet'
           AND cp.wallet_id IS NOT NULL
           AND cp.status = 'active'`,
        [batchId],
      );

      if (!itemRows?.length) {
        this.logger.log(
          `CommissionPayout: no wallet payout items found for batch_id=${batchId}`,
        );
        return;
      }

      let debitedCount = 0;

      for (const item of itemRows) {
        const walletId = Number(item.wallet_id);
        const amount = Number(item.amount);
        const currency = item.currency || 'COIN';
        const idempotencyKey = `commission_payout_${batchId}_${item.item_id}`;

        // Idempotency: skip if already processed
        const existingTxn = await this.ledgerService.findByIdempotencyKey(
          idempotencyKey,
          queryRunner,
        );

        if (existingTxn) {
          this.logger.log(
            `CommissionPayout: item_id=${item.item_id} already debited, skipping`,
          );
          continue;
        }

        // Check sufficient balance
        const balance = await this.balanceService.getBalance(walletId, queryRunner);
        const available = Number(balance?.available_amount || '0');
        if (available < amount) {
          this.logger.warn(
            `CommissionPayout: wallet_id=${walletId} has insufficient balance (${available} < ${amount}) for item_id=${item.item_id}, skipping`,
          );
          continue;
        }

        // Create debit ledger transaction
        const ledgerTxnId = await this.ledgerService.createDebitTransaction(
          {
            account_id: walletId,
            type: 'commission_payout',
            amount: String(amount),
            currency,
            ref_type: 'commission_payout_item',
            ref_id: String(item.item_id),
            idempotency_key: idempotencyKey,
            meta_json: {
              batch_id: batchId,
              participant_id: item.participant_id,
            },
          },
          queryRunner,
        );

        // Debit wallet balance snapshot
        await this.balanceService.debitBalance(walletId, String(amount), queryRunner);

        // Emit COMMISSION_PAYOUT_DEBITED
        await this.outboxService.enqueue(
          {
            event_name: 'COMMISSION_PAYOUT_DEBITED',
            event_version: 1,
            aggregate_type: 'WALLET',
            aggregate_id: String(walletId),
            actor_user_id: '0',
            occurred_at: new Date(),
            correlation_id: idempotencyKey,
            causation_id: `payout_batch_completed_${batchId}`,
            payload: {
              batch_id: batchId,
              payout_item_id: item.item_id,
              participant_id: item.participant_id,
              wallet_id: walletId,
              amount,
              currency,
              ledger_txn_id: ledgerTxnId,
            },
          },
          queryRunner,
        );

        debitedCount++;
        this.logger.log(
          `CommissionPayout: debited wallet_id=${walletId}, amount=${amount} ${currency}, item_id=${item.item_id}, ledger_txn_id=${ledgerTxnId}`,
        );
      }

      this.logger.log(
        `CommissionPayout: batch_id=${batchId} processed — ${debitedCount}/${itemRows.length} items debited`,
      );
    });
  }
}
