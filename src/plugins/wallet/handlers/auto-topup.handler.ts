import { Injectable, Logger } from '@nestjs/common';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { OutboxService } from '../../../corekit/services/outbox.service';

/**
 * AutoTopupHandler — C4
 *
 * Listens to WALLET_THRESHOLD_BREACHED events with threshold_code = 'deposit_urgent'.
 * Attempts to auto top-up the deposit wallet using the account's stored payment method.
 *
 * Flow:
 * 1. Find policy_deposit_requirement for the wallet (cross-plugin raw SQL read)
 * 2. Calculate shortfall = deposit_capacity_amount - current_available
 * 3. Find account's active payment method (cross-plugin raw SQL read)
 * 4a. If found: create payment_intent (cross-plugin raw SQL write, pragmatic exception)
 *              + emit AUTO_TOPUP_INITIATED
 * 4b. If not found: emit AUTO_TOPUP_NO_PAYMENT_METHOD (notification layer picks up)
 *
 * Idempotency: ON DUPLICATE KEY on idempotency_key prevents duplicate intents.
 */
@Injectable()
export class AutoTopupHandler {
  private readonly logger = new Logger(AutoTopupHandler.name);

  constructor(
    private readonly txService: TransactionService,
    private readonly outboxService: OutboxService,
  ) {}

  async handle(event: {
    wallet_id: number;
    threshold_code: string;
    available_amount: number;
    [key: string]: any;
  }): Promise<void> {
    if (event.threshold_code !== 'deposit_urgent') {
      return;
    }

    const walletId = Number(event.wallet_id);
    const idempotencyKey = `auto_topup_${walletId}_${event.threshold_code}_${Math.floor(Date.now() / 86400000)}`;

    await this.txService.run(async (queryRunner) => {
      // Read policy_deposit_requirement for this wallet (cross-plugin read)
      const [pdr] = await queryRunner.manager.query(
        `SELECT pdr.id, pdr.deposit_capacity_amount, pdr.policy_id,
                w.account_id
         FROM policy_deposit_requirement pdr
         JOIN wallet w ON w.id = pdr.deposit_wallet_id
         WHERE pdr.deposit_wallet_id = ?
           AND pdr.status IN ('warning', 'urgent', 'critical')
         LIMIT 1`,
        [walletId],
      );

      if (!pdr) {
        this.logger.log(`C4: no deposit requirement for wallet_id=${walletId}`);
        return;
      }

      const accountId = Number(pdr.account_id);
      const targetAmount = parseFloat(pdr.deposit_capacity_amount);
      const currentAvailable = Number(event.available_amount ?? 0);
      const topupAmount = Math.max(0, targetAmount - currentAvailable);

      if (topupAmount <= 0) {
        this.logger.log(`C4: no shortfall for wallet_id=${walletId}`);
        return;
      }

      // Find the account's active payment method (cross-plugin read)
      const [paymentMethod] = await queryRunner.manager.query(
        `SELECT id, provider, method_type
         FROM payment_method
         WHERE account_id = ? AND status = 'active'
         ORDER BY created_at DESC
         LIMIT 1`,
        [accountId],
      );

      if (!paymentMethod) {
        this.logger.warn(`C4: no payment method for account_id=${accountId}, wallet_id=${walletId}`);
        await this.outboxService.enqueue(
          {
            event_name: 'AUTO_TOPUP_NO_PAYMENT_METHOD',
            event_version: 1,
            aggregate_type: 'WALLET',
            aggregate_id: String(walletId),
            actor_user_id: '0',
            occurred_at: new Date(),
            correlation_id: idempotencyKey,
            causation_id: idempotencyKey,
            payload: {
              wallet_id: walletId,
              account_id: accountId,
              policy_id: pdr.policy_id,
              shortfall_amount: topupAmount,
            },
          },
          queryRunner,
        );
        return;
      }

      // Create payment_intent for auto top-up (cross-plugin write, pragmatic exception)
      const intentKey = `at_${walletId}_${Date.now()}`;
      await queryRunner.manager.query(
        `INSERT INTO payment_intent
           (intent_key, intent_type, account_id, payment_method_id,
            amount, currency, status, purpose_code,
            ref_type, ref_id, idempotency_key, created_at, updated_at)
         VALUES
           (?, 'auto_topup', ?, ?, ?, 'MYR', 'created', 'deposit_topup',
            'policy_deposit_requirement', ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
        [
          intentKey,
          accountId,
          paymentMethod.id,
          topupAmount,
          String(pdr.id),
          idempotencyKey,
        ],
      );

      const [intentRow] = await queryRunner.manager.query(
        `SELECT id FROM payment_intent WHERE idempotency_key = ? LIMIT 1`,
        [idempotencyKey],
      );

      this.logger.log(
        `C4: auto top-up intent created — wallet_id=${walletId}, amount=${topupAmount}, intent_id=${intentRow?.id}`,
      );

      await this.outboxService.enqueue(
        {
          event_name: 'AUTO_TOPUP_INITIATED',
          event_version: 1,
          aggregate_type: 'WALLET',
          aggregate_id: String(walletId),
          actor_user_id: '0',
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            wallet_id: walletId,
            account_id: accountId,
            policy_id: pdr.policy_id,
            topup_amount: topupAmount,
            payment_intent_id: intentRow?.id ?? null,
            payment_method_id: paymentMethod.id,
          },
        },
        queryRunner,
      );
    });
  }
}
