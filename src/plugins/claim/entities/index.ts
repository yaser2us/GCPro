/**
 * Claim Plugin - Entity Exports
 *
 * All 17 entities from the Claim pillar spec (claim.pillar.v2.yml)
 *
 * Aggregates (4):
 * - ClaimCase: Main claim submission and processing
 * - GuaranteeLetter: Cashless hospitalization guarantee letters
 * - MedicalCase: Hospital admission tracking
 * - MedicalUnderwritingCase: Pre-existing conditions assessment
 *
 * Supporting Entities (13):
 * - ClaimCaseNumberSequence, ClaimDocument, ClaimEvent, ClaimFraudSignal
 * - ClaimLink, ClaimReview, ClaimSettlementFlag
 * - MedicalCaseEvent, MedicalProvider
 * - MedicalUnderwritingOutcome, MedicalUnderwritingTerm
 * - MedicalUnderwritingCurrentOutcome, MedicalUnderwritingEvidence
 */

// Claim entities
export { ClaimCase } from './claim-case.entity';
export { ClaimCaseNumberSequence } from './claim-case-number-sequence.entity';
export { ClaimDocument } from './claim-document.entity';
export { ClaimEvent } from './claim-event.entity';
export { ClaimFraudSignal } from './claim-fraud-signal.entity';
export { ClaimLink } from './claim-link.entity';
export { ClaimReview } from './claim-review.entity';
export { ClaimSettlementFlag } from './claim-settlement-flag.entity';

// Guarantee Letter entities
export { GuaranteeLetter } from './guarantee-letter.entity';

// Medical Case entities
export { MedicalCase } from './medical-case.entity';
export { MedicalCaseEvent } from './medical-case-event.entity';
export { MedicalProvider } from './medical-provider.entity';

// Medical Underwriting entities
export { MedicalUnderwritingCase } from './medical-underwriting-case.entity';
export { MedicalUnderwritingOutcome } from './medical-underwriting-outcome.entity';
export { MedicalUnderwritingTerm } from './medical-underwriting-term.entity';
export { MedicalUnderwritingCurrentOutcome } from './medical-underwriting-current-outcome.entity';
export { MedicalUnderwritingEvidence } from './medical-underwriting-evidence.entity';
