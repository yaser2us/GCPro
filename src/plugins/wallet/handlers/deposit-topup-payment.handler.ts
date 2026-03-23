import { Injectable, Logger } from '@nestjs/common';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { OutboxService } from '../../../corekit/services/outbox.service';

/**
 * DepositTopupPaymentHandler — C4
 *
 * Listens to PAYMENT_SUCCEEDED events where purpose_code = 'deposit_topup'.
 * Creates a wallet_deposit_intent to credit the deposit wallet.
 *
 * Flow:
 * 1. Guard: only handle purpose_code='deposit_topup'
 * 2. Find policy_deposit_requirement from ref_id
 * 3. Create wallet_deposit_intent for the deposit wallet (idempotent)
 * 4. Emit DEPOSIT_TOPUP_CREDITED
 */
@Injectable()
export class DepositTopupPaymentHandler {
  private readonly logger = new Logger(DepositTopupPaymentHandler.name);

  constructor(
    private readonly txService: TransactionService,
    private readonly outboxService: OutboxService,
  ) {}

  async handle(event: {
    intent_id: number;
    intent_key: string;
    amount: number;
    currency: string;
    purpose_code: string;
    ref_type: string;
    ref_id: string;
    account_id?: number;
    [key: string]: any;
  }): Promise<void> {
    if (event.purpose_code !== 'deposit_topup') {
      return;
    }

    const idempotencyKey = `deposit_topup_payment_${event.intent_id}`;

    await this.txService.run(async (queryRunner) => {
      // Find the policy_deposit_requirement to get deposit_wallet_id
      const [pdr] = await queryRunner.manager.query(
        `SELECT id, deposit_wallet_id, policy_id
         FROM policy_deposit_requirement
         WHERE id = ? LIMIT 1`,
        [event.ref_id],
      );

      if (!pdr || !pdr.deposit_wallet_id) {
        this.logger.error(
          `C4: policy_deposit_requirement not found or missing deposit_wallet_id — ref_id=${event.ref_id}`,
        );
        return;
      }

      const walletId = Number(pdr.deposit_wallet_id);

      // Create wallet_deposit_intent to credit the deposit wallet (idempotent)
      await queryRunner.manager.query(
        `INSERT INTO wallet_deposit_intent
           (wallet_id, account_id, amount, currency, status,
            ref_type, ref_id, idempotency_key, created_at, updated_at)
         VALUES
           (?, ?, ?, ?, 'created',
            'payment_intent', ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
        [
          walletId,
          event.account_id ?? 0,
          event.amount,
          event.currency ?? 'MYR',
          String(event.intent_id),
          idempotencyKey,
        ],
      );

      const [intentRow] = await queryRunner.manager.query(
        `SELECT id FROM wallet_deposit_intent WHERE idempotency_key = ? LIMIT 1`,
        [idempotencyKey],
      );

      this.logger.log(
        `C4: deposit top-up credited — wallet_id=${walletId}, amount=${event.amount}, deposit_intent_id=${intentRow?.id}`,
      );

      await this.outboxService.enqueue(
        {
          event_name: 'DEPOSIT_TOPUP_CREDITED',
          event_version: 1,
          aggregate_type: 'WALLET',
          aggregate_id: String(walletId),
          actor_user_id: '0',
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: `payment-succeeded-${event.intent_id}`,
          payload: {
            wallet_id: walletId,
            policy_id: pdr.policy_id,
            amount: event.amount,
            currency: event.currency ?? 'MYR',
            payment_intent_id: event.intent_id,
            deposit_intent_id: intentRow?.id ?? null,
          },
        },
        queryRunner,
      );
    });
  }
}
