import { Injectable, Logger } from '@nestjs/common';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { VerificationStatusRepository } from '../repositories/verification-status.repo';

/**
 * KycVerifiedHandler (identity plugin)
 * Handles KYC_VERIFIED events from Foundation pillar.
 * Upserts verification_status: type='kyc', status='verified'.
 * Source: specs/identity/identity.pillar.v2.yml — integration.foundation.consumers[KYC_VERIFIED]
 */
@Injectable()
export class KycVerifiedHandler {
  private readonly logger = new Logger(KycVerifiedHandler.name);

  constructor(
    private readonly txService: TransactionService,
    private readonly verificationStatusRepo: VerificationStatusRepository,
  ) {}

  async handle(event: {
    kyc_id: number;
    subject_type: string;
    subject_id: number;
    provider: string;
  }): Promise<{ account_id: number; type: string; status: string }> {
    return this.txService.run(async (queryRunner) => {
      const account_id = event.subject_id;

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
        `Upserted verification_status: account_id=${account_id}, type=kyc, status=verified, kyc_id=${event.kyc_id}`,
      );

      return { account_id, type: 'kyc', status: 'verified' };
    });
  }
}
