import { Injectable, Logger } from '@nestjs/common';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { PolicyRemediationCaseRepository } from '../repositories/policy-remediation-case.repo';
import { PolicyRepository } from '../repositories/policy.repo';

/**
 * WalletThresholdBreachedHandler — C8
 *
 * Listens to WALLET_THRESHOLD_BREACHED events emitted by the wallet plugin.
 * When a deposit wallet balance falls below the urgent threshold
 * (threshold_code='deposit_urgent'), opens a policy_remediation_case
 * with reason_code='deposit_low' and grace_end_at = NOW() + policy.deposit_topup_grace_days.
 *
 * Idempotency: checks for existing open remediation case with same reason_code
 * before inserting a new one.
 */
@Injectable()
export class WalletThresholdBreachedHandler {
  private readonly logger = new Logger(WalletThresholdBreachedHandler.name);

  constructor(
    private readonly txService: TransactionService,
    private readonly remediationRepo: PolicyRemediationCaseRepository,
    private readonly policyRepo: PolicyRepository,
  ) {}

  async handle(event: {
    wallet_id: number;
    threshold_code: string;
    available_amount: string;
    threshold_amount: string;
    [key: string]: any;
  }): Promise<void> {
    // Only act on urgent threshold (deposit_urgent = 50% floor)
    if (event.threshold_code !== 'deposit_urgent') {
      this.logger.log(
        `C8: ignoring threshold_code=${event.threshold_code} for wallet_id=${event.wallet_id}`,
      );
      return;
    }

    await this.txService.run(async (queryRunner) => {
      // Find the policy linked to this deposit wallet
      const [policyRow] = await queryRunner.manager.query(
        `SELECT p.id, p.deposit_topup_grace_days
         FROM policy p
         JOIN policy_deposit_requirement pdr ON pdr.policy_id = p.id
         WHERE pdr.deposit_wallet_id = ?
           AND p.status IN ('active', 'pending_payment')
         LIMIT 1`,
        [event.wallet_id],
      );

      if (!policyRow) {
        this.logger.log(`C8: no active policy found for deposit wallet_id=${event.wallet_id}`);
        return;
      }

      const policyId = Number(policyRow.id);
      const graceDays = Number(policyRow.deposit_topup_grace_days ?? 14);

      // Idempotency: skip if open remediation case already exists
      const existing = await queryRunner.manager.query(
        `SELECT id FROM policy_remediation_case
         WHERE policy_id = ? AND reason_code = 'deposit_low' AND status IN ('open','in_progress')
         LIMIT 1`,
        [policyId],
      );
      if (existing.length) {
        this.logger.log(
          `C8: remediation case already open for policy_id=${policyId}, skipping`,
        );
        return;
      }

      const graceEndAt = new Date();
      graceEndAt.setDate(graceEndAt.getDate() + graceDays);

      await this.remediationRepo.create(
        {
          policy_id: policyId,
          reason_code: 'deposit_low',
          status: 'open',
          opened_at: new Date(),
          grace_end_at: graceEndAt,
          meta: {
            wallet_id: event.wallet_id,
            available_amount: event.available_amount,
            threshold_amount: event.threshold_amount,
          },
        },
        queryRunner,
      );

      this.logger.log(
        `C8: opened remediation case for policy_id=${policyId}, grace_end_at=${graceEndAt.toISOString()}`,
      );
    });
  }
}
