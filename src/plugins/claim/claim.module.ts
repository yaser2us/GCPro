import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClaimCase } from './entities/claim-case.entity';
import { ClaimCaseNumberSequence } from './entities/claim-case-number-sequence.entity';
import { ClaimDocument } from './entities/claim-document.entity';
import { ClaimEvent } from './entities/claim-event.entity';
import { ClaimFraudSignal } from './entities/claim-fraud-signal.entity';
import { ClaimLink } from './entities/claim-link.entity';
import { ClaimReview } from './entities/claim-review.entity';
import { ClaimSettlementFlag } from './entities/claim-settlement-flag.entity';
import { GuaranteeLetter } from './entities/guarantee-letter.entity';
import { MedicalCase } from './entities/medical-case.entity';
import { MedicalCaseEvent } from './entities/medical-case-event.entity';
import { MedicalProvider } from './entities/medical-provider.entity';
import { MedicalUnderwritingCase } from './entities/medical-underwriting-case.entity';
import { MedicalUnderwritingOutcome } from './entities/medical-underwriting-outcome.entity';
import { MedicalUnderwritingTerm } from './entities/medical-underwriting-term.entity';
import { MedicalUnderwritingCurrentOutcome } from './entities/medical-underwriting-current-outcome.entity';
import { MedicalUnderwritingEvidence } from './entities/medical-underwriting-evidence.entity';
import { ClaimCaseRepository } from './repositories/claim-case.repo';
import { ClaimCaseNumberSequenceRepository } from './repositories/claim-case-number-sequence.repo';
import { ClaimDocumentRepository } from './repositories/claim-document.repo';
import { ClaimEventRepository } from './repositories/claim-event.repo';
import { ClaimFraudSignalRepository } from './repositories/claim-fraud-signal.repo';
import { ClaimLinkRepository } from './repositories/claim-link.repo';
import { ClaimReviewRepository } from './repositories/claim-review.repo';
import { ClaimSettlementFlagRepository } from './repositories/claim-settlement-flag.repo';
import { GuaranteeLetterRepository } from './repositories/guarantee-letter.repo';
import { MedicalCaseRepository } from './repositories/medical-case.repo';
import { MedicalCaseEventRepository } from './repositories/medical-case-event.repo';
import { MedicalProviderRepository } from './repositories/medical-provider.repo';
import { MedicalUnderwritingCaseRepository } from './repositories/medical-underwriting-case.repo';
import { MedicalUnderwritingOutcomeRepository } from './repositories/medical-underwriting-outcome.repo';
import { MedicalUnderwritingTermRepository } from './repositories/medical-underwriting-term.repo';
import { MedicalUnderwritingCurrentOutcomeRepository } from './repositories/medical-underwriting-current-outcome.repo';
import { MedicalUnderwritingEvidenceRepository } from './repositories/medical-underwriting-evidence.repo';
import { ClaimWorkflowService } from './services/claim.workflow.service';
import { ClaimController } from './controllers/claim.controller';
import { GuaranteeLetterController } from './controllers/guarantee-letter.controller';
import { MedicalCaseController } from './controllers/medical-case.controller';
import { UnderwritingController } from './controllers/underwriting.controller';

/**
 * ClaimModule
 * Provides claim management capabilities including claim submission, review,
 * approval, settlement, guarantee letters, medical cases, and medical underwriting
 * Based on specs/claim/claim.pillar.v2.yml
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClaimCase,
      ClaimCaseNumberSequence,
      ClaimDocument,
      ClaimEvent,
      ClaimFraudSignal,
      ClaimLink,
      ClaimReview,
      ClaimSettlementFlag,
      GuaranteeLetter,
      MedicalCase,
      MedicalCaseEvent,
      MedicalProvider,
      MedicalUnderwritingCase,
      MedicalUnderwritingOutcome,
      MedicalUnderwritingTerm,
      MedicalUnderwritingCurrentOutcome,
      MedicalUnderwritingEvidence,
    ]),
  ],
  providers: [
    ClaimCaseRepository,
    ClaimCaseNumberSequenceRepository,
    ClaimDocumentRepository,
    ClaimEventRepository,
    ClaimFraudSignalRepository,
    ClaimLinkRepository,
    ClaimReviewRepository,
    ClaimSettlementFlagRepository,
    GuaranteeLetterRepository,
    MedicalCaseRepository,
    MedicalCaseEventRepository,
    MedicalProviderRepository,
    MedicalUnderwritingCaseRepository,
    MedicalUnderwritingOutcomeRepository,
    MedicalUnderwritingTermRepository,
    MedicalUnderwritingCurrentOutcomeRepository,
    MedicalUnderwritingEvidenceRepository,
    ClaimWorkflowService,
  ],
  controllers: [
    ClaimController,
    GuaranteeLetterController,
    MedicalCaseController,
    UnderwritingController,
  ],
  exports: [ClaimWorkflowService],
})
export class ClaimModule {}
