import { Injectable, Logger } from '@nestjs/common';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { VerificationStatusRepository } from '../repositories/verification-status.repo';

/**
 * KYC Verified Handler
 *
 * Handles KYC_VERIFIED events from the foundation pillar.
 * Upserts a verification_status record for the account with type='kyc'.
 *
 * Scope: Single responsibility - only updates verification status on KYC completion
 *
 * Flow:
 * 1. Treat subject_id as account_id regardless of subject_type
 * 2. Upsert verification_status: type='kyc', status='verified'
 * 3. Return result
 *
 * Idempotency:
 * - Handled by repository upsert (ON DUPLICATE KEY UPDATE)
 * - Safe to retry
 */
@Injectable()
export class KycVerifiedHandler {
  private readonly logger = new Logger(KycVerifiedHandler.name);

  constructor(
    private readonly txService: TransactionService,
    private readonly verificationStatusRepo: VerificationStatusRepository,
  ) {}

  /**
   * Handle KYC_VERIFIED event - upsert verification status
   *
   * @param event - Event payload from foundation pillar
   * @returns Result with account_id, type, and status
   */
  async handle(event: {
    kyc_id: number;
    subject_type: string;
    subject_id: number;
    provider: string;
  }): Promise<{ account_id: number; type: string; status: string }> {
    const result = await this.txService.run(async (queryRunner) => {
      // === STEP 1: Treat subject_id as account_id ===
      const account_id = event.subject_id;

      // === STEP 2: Upsert verification status ===
      await this.verificationStatusRepo.upsert(
        {
          account_id,
          type: 'kyc',
          status: 'verified',
          meta_json: { provider: event.provider, kyc_id: event.kyc_id },
        },
        queryRunner,
      );

      this.logger.log(
        `Upserted verification status: account_id=${account_id}, type=kyc, status=verified, kyc_id=${event.kyc_id}`,
      );

      // === STEP 3: Return result ===
      return { account_id, type: 'kyc', status: 'verified' };
    });

    return result;
  }
}
