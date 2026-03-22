import { Injectable, Logger } from '@nestjs/common';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { OutboxService } from '../../../corekit/services/outbox.service';
import { WalletSpendIntentRepository } from '../repositories/wallet-spend-intent.repo';

/**
 * Policy Activated Handler
 *
 * Handles POLICY_ACTIVATED events from the policy pillar.
 * Creates a WalletSpendIntent for premium deduction when a policy is activated.
 *
 * Scope: Single responsibility - only creates spend intents for policy premium deductions
 *
 * Flow:
 * 1. Get policy_id from event
 * 2. Fetch and validate policy (must be active)
 * 3. Fetch wallet for the policy's account
 * 4. Check idempotency (skip if already processed)
 * 5. Determine premium amount (from event or billing plan)
 * 6. Insert WalletSpendIntent
 * 7. Emit SPEND_INTENT_CREATED outbox event
 *
 * Idempotency:
 * - UNIQUE(idempotency_key) = 'policy_premium_spend_{policy_id}'
 * - Safe to retry
 *
 * Based on: specs/wallet-advanced/wallet-advanced.pillar.v2.yml integration section
 */
@Injectable()
export class PolicyActivatedHandler {
  private readonly logger = new Logger(PolicyActivatedHandler.name);

  constructor(
    private readonly txService: TransactionService,
    private readonly outboxService: OutboxService,
    private readonly spendIntentRepo: WalletSpendIntentRepository,
  ) {}

  /**
   * Handle POLICY_ACTIVATED event - create a spend intent for premium deduction
   *
   * @param event - Event payload from policy pillar
   * @returns Result indicating success or skip reason
   */
  async handle(event: {
    policy_id: number;
    intent_id?: number;
    amount?: number;
    currency?: string;
  }): Promise<
    | { skipped: true; reason: string; spend_intent_id?: number }
    | { skipped?: false; spend_intent_id: number; wallet_id: number; policy_id: number; amount: string }
  > {
    const result = await this.txService.run(async (queryRunner) => {
      const { policy_id } = event;

      // === STEP 1: Idempotency key ===
      const idempotencyKey = `policy_premium_spend_${policy_id}`;

      // === STEP 2: Fetch policy ===
      const [policy] = await queryRunner.manager.query(
        'SELECT * FROM policy WHERE id = ?',
        [policy_id],
      );

      if (!policy) {
        this.logger.error(
          `Policy not found: policy_id=${policy_id}`,
        );
        return { skipped: true as const, reason: 'POLICY_NOT_FOUND' };
      }

      // === STEP 3: Guard: policy must be active ===
      if (policy.status !== 'active') {
        this.logger.error(
          `Policy is not active: policy_id=${policy_id}, status=${policy.status}`,
        );
        return { skipped: true as const, reason: 'POLICY_NOT_ACTIVE' };
      }

      // === STEP 4: Get account_id from policy ===
      const account_id = policy.account_id;

      // === STEP 5: Fetch wallet ===
      const [wallet] = await queryRunner.manager.query(
        'SELECT * FROM wallet WHERE account_id = ? AND status = ? LIMIT 1',
        [account_id, 'active'],
      );

      if (!wallet) {
        this.logger.error(
          `Active wallet not found: account_id=${account_id}, policy_id=${policy_id}`,
        );
        return { skipped: true as const, reason: 'WALLET_NOT_FOUND' };
      }

      // === STEP 6: Check idempotency - look for existing spend intent ===
      const existingIntent = await this.spendIntentRepo.findByIdempotencyKey(
        idempotencyKey,
        queryRunner,
      );

      if (existingIntent) {
        this.logger.log(
          `Spend intent already exists: policy_id=${policy_id}, spend_intent_id=${existingIntent.id}`,
        );
        return {
          skipped: true as const,
          reason: 'ALREADY_PROCESSED',
          spend_intent_id: existingIntent.id,
        };
      }

      // === STEP 7: Determine premium amount ===
      let premiumAmount: string;

      if (event.amount != null) {
        premiumAmount = String(event.amount);
      } else {
        const [billingPlan] = await queryRunner.manager.query(
          'SELECT * FROM policy_billing_plan WHERE policy_id = ? AND status = ? LIMIT 1',
          [policy_id, 'active'],
        );
        premiumAmount = billingPlan?.premium_amount ?? '0.00';
      }

      // === STEP 8: Insert spend intent ===
      const spendIntentId = await this.spendIntentRepo.insert(
        {
          wallet_id: wallet.id,
          account_id,
          amount: premiumAmount,
          currency: event.currency ?? 'MYR',
          status: 'created',
          ref_type: 'policy',
          ref_id: String(policy_id),
          idempotency_key: idempotencyKey,
        },
        queryRunner,
      );

      // === STEP 9: Emit SPEND_INTENT_CREATED outbox event ===
      await this.outboxService.enqueue(
        {
          event_name: 'SPEND_INTENT_CREATED',
          event_version: 1,
          aggregate_type: 'SPEND_INTENT',
          aggregate_id: String(spendIntentId),
          actor_user_id: 'system',
          occurred_at: new Date(),
          correlation_id: `policy-activated-${policy_id}`,
          causation_id: `event-policy-activated-${policy_id}`,
          payload: {
            wallet_id: wallet.id,
            policy_id,
            amount: premiumAmount,
            currency: event.currency ?? 'MYR',
          },
        },
        queryRunner,
      );

      return {
        spend_intent_id: spendIntentId,
        wallet_id: wallet.id,
        policy_id,
        amount: premiumAmount,
      };
    });

    return result;
  }
}
