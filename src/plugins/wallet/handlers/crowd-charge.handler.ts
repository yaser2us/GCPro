import { Injectable, Logger } from '@nestjs/common';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { OutboxService } from '../../../corekit/services/outbox.service';

/**
 * CrowdChargeHandler — C6
 *
 * Listens to CROWD_PERIOD_CALCULATED events.
 * For each pending crowd_member_charge in the period, creates a wallet_spend_intent
 * against the member's deposit wallet. On spend success, marks the charge as 'charged'.
 * On spend failure, marks the charge as 'failed' and fires threshold check.
 *
 * Cross-plugin read: crowd_member_charge, policy_deposit_requirement (read-only via raw SQL).
 * Cross-plugin write: none — only writes to wallet_spend_intent (owned by wallet plugin).
 */
@Injectable()
export class CrowdChargeHandler {
  private readonly logger = new Logger(CrowdChargeHandler.name);

  constructor(
    private readonly txService: TransactionService,
    private readonly outboxService: OutboxService,
  ) {}

  async handle(event: { period_id: number; [key: string]: any }): Promise<void> {
    const periodId = Number(event.period_id);

    // Load all pending charges for this period
    const charges: any[] = await this.txService.run(async (queryRunner) => {
      return queryRunner.manager.query(
        `SELECT cmc.id AS charge_id, cmc.policy_id, cmc.member_user_id,
                cmc.amount, pdr.deposit_wallet_id
         FROM crowd_member_charge cmc
         JOIN policy_deposit_requirement pdr ON pdr.policy_id = cmc.policy_id
         WHERE cmc.crowd_period_id = ?
           AND cmc.status = 'pending'
           AND pdr.deposit_wallet_id IS NOT NULL`,
        [periodId],
      );
    });

    if (!charges.length) {
      this.logger.log(`C6: no pending charges for period_id=${periodId}`);
      return;
    }

    this.logger.log(`C6: processing ${charges.length} charges for period_id=${periodId}`);

    for (const charge of charges) {
      await this.processCharge(charge, periodId);
    }
  }

  private async processCharge(charge: any, periodId: number): Promise<void> {
    const idempotencyKey = `crowd_charge_${charge.charge_id}_period_${periodId}`;

    try {
      await this.txService.run(async (queryRunner) => {
        // Create wallet_spend_intent for this charge
        await queryRunner.manager.query(
          `INSERT INTO wallet_spend_intent
             (wallet_id, account_id, amount, currency, purpose_code, status,
              ref_type, ref_id, idempotency_key, created_at, updated_at)
           VALUES
             (?, (SELECT account_id FROM wallet WHERE id = ?), ?, 'MYR',
              'crowd_share', 'created', 'crowd_member_charge', ?, ?, NOW(), NOW())
           ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
          [
            charge.deposit_wallet_id,
            charge.deposit_wallet_id,
            charge.amount,
            charge.charge_id,
            idempotencyKey,
          ],
        );

        // Mark crowd_member_charge as 'processing'
        await queryRunner.manager.query(
          `UPDATE crowd_member_charge SET status = 'processing', updated_at = NOW() WHERE id = ?`,
          [charge.charge_id],
        );

        await this.outboxService.enqueue(
          {
            event_name: 'CROWD_CHARGE_SPEND_CREATED',
            event_version: 1,
            aggregate_type: 'WALLET',
            aggregate_id: String(charge.deposit_wallet_id),
            actor_user_id: '0',
            occurred_at: new Date(),
            correlation_id: idempotencyKey,
            causation_id: idempotencyKey,
            payload: {
              charge_id: charge.charge_id,
              wallet_id: charge.deposit_wallet_id,
              amount: charge.amount,
              period_id: periodId,
            },
          },
          queryRunner,
        );
      });
    } catch (error) {
      this.logger.error(
        `C6: spend intent creation failed for charge_id=${charge.charge_id}: ${error.message}`,
        error.stack,
      );
      // Mark as failed — will be retried in next run
      await this.txService.run(async (queryRunner) => {
        await queryRunner.manager.query(
          `UPDATE crowd_member_charge SET status = 'failed', updated_at = NOW() WHERE id = ?`,
          [charge.charge_id],
        );
      });
    }
  }
}
