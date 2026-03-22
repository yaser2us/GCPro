import { Injectable, Logger } from '@nestjs/common';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { PolicyBenefitUsageRepository } from '../repositories/policy-benefit-usage.repo';

/**
 * Claim Settled Handler
 *
 * Handles CLAIM_SETTLED events from the claim pillar.
 * Records or increments policy benefit usage when a claim is settled.
 *
 * Scope: Single responsibility - only tracks benefit usage on claim settlement
 *
 * Flow:
 * 1. Guard: policy_id must be present (skip if null)
 * 2. Resolve item_code (default to 'general' if absent)
 * 3. Check if a benefit usage record already exists for (policy_id, period_key, item_code)
 * 4. If exists: increment used_amount and used_count
 * 5. If not exists: insert new record with used_count = 1
 *
 * Idempotency:
 * - Uses SELECT → conditional INSERT/UPDATE pattern
 * - No outbox emit needed
 *
 * Based on: specs/claim/claim.pillar.v2.yml cross-pillar integration section
 */
@Injectable()
export class ClaimSettledHandler {
  private readonly logger = new Logger(ClaimSettledHandler.name);

  constructor(
    private readonly txService: TransactionService,
    private readonly benefitUsageRepo: PolicyBenefitUsageRepository,
  ) {}

  /**
   * Handle CLAIM_SETTLED event - record policy benefit usage
   *
   * @param event - Event payload from claim pillar
   * @returns Result indicating success or skip reason
   */
  async handle(event: {
    claim_id: number;
    claim_number: string;
    approved_amount: number;
    period_key: string;
    policy_id?: number | null;
    item_code?: string | null;
  }): Promise<
    | { skipped: true; reason: string }
    | { policy_id: number; period_key: string; item_code: string; approved_amount: string }
  > {
    const result = await this.txService.run(async (queryRunner) => {
      // === STEP 1: Guard — policy_id must be present ===
      if (event.policy_id == null) {
        return { skipped: true as const, reason: 'NO_POLICY_ID' };
      }

      // === STEP 2: Resolve item_code ===
      const policy_id = event.policy_id;
      const period_key = event.period_key;
      const item_code = event.item_code ?? 'general';
      const approved_amount = String(event.approved_amount);

      // === STEP 3: Idempotency — check existing record ===
      const [existing] = await queryRunner.manager.query(
        'SELECT id, used_amount, used_count FROM policy_benefit_usage WHERE policy_id = ? AND period_key = ? AND item_code = ?',
        [policy_id, period_key, item_code],
      );

      if (existing) {
        // === STEP 4: Increment existing record ===
        await queryRunner.manager.query(
          'UPDATE policy_benefit_usage SET used_amount = used_amount + ?, used_count = used_count + 1 WHERE id = ?',
          [approved_amount, existing.id],
        );

        this.logger.log(
          `Incremented benefit usage: policy_id=${policy_id}, period_key=${period_key}, item_code=${item_code}, added=${approved_amount}`,
        );
      } else {
        // === STEP 5: Insert new record ===
        await queryRunner.manager.query(
          'INSERT INTO policy_benefit_usage (policy_id, period_key, item_code, used_amount, used_count) VALUES (?, ?, ?, ?, 1)',
          [policy_id, period_key, item_code, approved_amount],
        );

        this.logger.log(
          `Created benefit usage: policy_id=${policy_id}, period_key=${period_key}, item_code=${item_code}, amount=${approved_amount}`,
        );
      }

      return { policy_id, period_key, item_code, approved_amount };
    });

    return result;
  }
}
