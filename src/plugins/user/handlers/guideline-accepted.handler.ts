import { Injectable, Logger } from '@nestjs/common';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { OnboardingProgressRepository } from '../repositories/onboarding-progress.repo';

/**
 * Guideline Accepted Handler
 *
 * Handles GUIDELINE_ACCEPTED events from the foundation pillar.
 * Upserts an onboarding_progress record marking 'guideline_accepted' as completed.
 *
 * Scope: Single responsibility - only records onboarding progress on guideline acceptance
 *
 * Flow:
 * 1. Guard: user_id must be present (skip if null)
 * 2. Upsert onboarding_progress: step_code='guideline_accepted', state='completed'
 * 3. Return result
 *
 * Idempotency:
 * - Handled by repository upsert (orUpdate on user_id, step_code conflict)
 * - Safe to retry
 */
@Injectable()
export class GuidelineAcceptedHandler {
  private readonly logger = new Logger(GuidelineAcceptedHandler.name);

  constructor(
    private readonly txService: TransactionService,
    private readonly onboardingProgressRepo: OnboardingProgressRepository,
  ) {}

  /**
   * Handle GUIDELINE_ACCEPTED event - upsert onboarding progress
   *
   * @param event - Event payload from foundation pillar
   * @returns Result indicating success or skip reason
   */
  async handle(event: {
    acceptance_id: number;
    version_id: number;
    account_id?: number | null;
    person_id?: number | null;
    user_id?: number | null;
    acceptance_status: string;
    channel: string;
    source: string;
  }): Promise<
    | { skipped: true; reason: string }
    | { user_id: number; step_code: string; state: string }
  > {
    const result = await this.txService.run(async (queryRunner) => {
      // === STEP 1: Guard — user_id must be present ===
      if (event.user_id == null) {
        return { skipped: true as const, reason: 'NO_USER_ID' };
      }

      // === STEP 2: Resolve values ===
      const user_id = Number(event.user_id);
      const step_code = 'guideline_accepted';

      // === STEP 3: Upsert onboarding progress ===
      await this.onboardingProgressRepo.upsert(
        {
          user_id,
          step_code,
          state: 'completed',
          meta_json: {
            version_id: event.version_id,
            acceptance_id: event.acceptance_id,
          },
        },
        queryRunner,
      );

      this.logger.log(
        `Upserted onboarding progress: user_id=${user_id}, step_code=${step_code}, state=completed, acceptance_id=${event.acceptance_id}`,
      );

      // === STEP 4: Return result ===
      return { user_id, step_code, state: 'completed' };
    });

    return result;
  }
}
