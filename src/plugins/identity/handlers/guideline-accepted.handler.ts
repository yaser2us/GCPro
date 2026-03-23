import { Injectable, Logger } from '@nestjs/common';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { OnboardingProgressRepository } from '../repositories/onboarding-progress.repo';

/**
 * GuidelineAcceptedHandler (identity plugin)
 * Handles GUIDELINE_ACCEPTED events from Foundation pillar.
 * Upserts onboarding_progress: step_code='guideline_accepted', state='completed'.
 * Source: specs/identity/identity.pillar.v2.yml — integration.foundation.consumers[GUIDELINE_ACCEPTED]
 */
@Injectable()
export class GuidelineAcceptedHandler {
  private readonly logger = new Logger(GuidelineAcceptedHandler.name);

  constructor(
    private readonly txService: TransactionService,
    private readonly onboardingProgressRepo: OnboardingProgressRepository,
  ) {}

  async handle(event: {
    acceptance_id: number;
    version_id: number;
    account_id?: number | null;
    person_id?: number | null;
    user_id?: number | null;
    acceptance_status: string;
    channel: string;
    source: string;
  }): Promise<{ skipped: true; reason: string } | { user_id: number; step_code: string; state: string }> {
    return this.txService.run(async (queryRunner) => {
      if (event.user_id == null) {
        return { skipped: true as const, reason: 'NO_USER_ID' };
      }

      const user_id = Number(event.user_id);
      const step_code = 'guideline_accepted';

      await this.onboardingProgressRepo.upsert(
        {
          user_id,
          step_code,
          state: 'completed',
          meta_json: { version_id: event.version_id, acceptance_id: event.acceptance_id },
        },
        queryRunner,
      );

      this.logger.log(
        `Upserted onboarding_progress: user_id=${user_id}, step_code=${step_code}, state=completed`,
      );

      return { user_id, step_code, state: 'completed' };
    });
  }
}
