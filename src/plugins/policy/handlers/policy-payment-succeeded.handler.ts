import { Injectable, Logger } from '@nestjs/common';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { OutboxService } from '../../../corekit/services/outbox.service';
import { PolicyRepository } from '../repositories/policy.repo';
import { PolicyStatusEventRepository } from '../repositories/policy-status-event.repo';

/**
 * Policy Payment Succeeded Handler
 *
 * Handles PAYMENT_SUCCEEDED events from the payment pillar.
 * Activates a policy when its premium payment succeeds.
 *
 * Scope: Single responsibility - only activates policies on payment success
 *
 * Flow:
 * 1. Parse policy_id from event.ref_id
 * 2. Fetch and validate policy
 * 3. Guard against invalid states (idempotency, wrong status)
 * 4. Update policy status to 'active'
 * 5. Record policy_status_event
 * 6. Emit POLICY_ACTIVATED outbox event
 *
 * Idempotency:
 * - Skips if policy.status is already 'active'
 * - Safe to retry
 *
 * Based on: specs/policy/policy.pillar.v2.yml integration section
 */
@Injectable()
export class PolicyPaymentSucceededHandler {
  private readonly logger = new Logger(PolicyPaymentSucceededHandler.name);

  constructor(
    private readonly txService: TransactionService,
    private readonly outboxService: OutboxService,
    private readonly policyRepo: PolicyRepository,
    private readonly statusEventRepo: PolicyStatusEventRepository,
  ) {}

  /**
   * Handle PAYMENT_SUCCEEDED event - activate the referenced policy
   *
   * @param event - Event payload from payment pillar
   * @returns Result indicating success or skip reason
   */
  async handle(event: {
    intent_id: number;
    intent_key: string;
    amount: number;
    currency: string;
    purpose_code: string;
    ref_type: string;
    ref_id: string;
    payment_method_id: number;
    account_id?: number;
  }): Promise<
    | { skipped: true; reason: string }
    | { skipped?: false; policy_id: number; status: string; intent_id: number }
  > {
    const result = await this.txService.run(async (queryRunner) => {
      // === STEP 1: Parse policy_id ===
      const policy_id = Number(event.ref_id);

      // === STEP 2: Fetch policy ===
      const policy = await this.policyRepo.findById(policy_id, queryRunner);

      if (!policy) {
        this.logger.error(
          `Policy not found: policy_id=${policy_id}, intent_id=${event.intent_id}`,
        );
        return { skipped: true as const, reason: 'POLICY_NOT_FOUND' };
      }

      // === STEP 3: Idempotency guard - skip if already active ===
      if (policy.status === 'active') {
        this.logger.log(
          `Policy already active: policy_id=${policy_id}, intent_id=${event.intent_id}`,
        );
        return { skipped: true as const, reason: 'ALREADY_ACTIVE' };
      }

      // === STEP 4: Guard: policy must be in 'pending' status ===
      if (policy.status !== 'pending') {
        this.logger.error(
          `Policy in invalid status for activation: policy_id=${policy_id}, status=${policy.status}, intent_id=${event.intent_id}`,
        );
        return { skipped: true as const, reason: 'INVALID_STATUS' };
      }

      // === STEP 5: Update policy status to 'active' ===
      await this.policyRepo.update(
        policy_id,
        {
          status: 'active',
          start_at: new Date(),
        },
        queryRunner,
      );

      // === STEP 6: Record policy_status_event ===
      await this.statusEventRepo.create(
        {
          policy_id,
          event_type: 'POLICY_ACTIVATED',
          from_status: 'pending',
          to_status: 'active',
          trigger_code: 'payment.succeeded',
          actor_type: 'system',
          actor_id: null,
        },
        queryRunner,
      );

      // === STEP 7: Emit POLICY_ACTIVATED outbox event ===
      await this.outboxService.enqueue(
        {
          event_name: 'POLICY_ACTIVATED',
          event_version: 1,
          aggregate_type: 'POLICY',
          aggregate_id: String(policy_id),
          actor_user_id: 'system',
          occurred_at: new Date(),
          correlation_id: `payment-succeeded-${event.intent_id}`,
          causation_id: `event-payment-succeeded-${event.intent_id}`,
          payload: {
            policy_id,
            intent_id: event.intent_id,
            amount: event.amount,
            currency: event.currency,
          },
        },
        queryRunner,
      );

      return {
        policy_id,
        status: 'active',
        intent_id: event.intent_id,
      };
    });

    return result;
  }
}
