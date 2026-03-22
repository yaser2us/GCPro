import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { OutboxService } from '../../../corekit/services/outbox.service';
import { ClaimCaseRepository } from '../repositories/claim-case.repo';
import { ClaimCaseNumberSequenceRepository } from '../repositories/claim-case-number-sequence.repo';
import { ClaimDocumentRepository } from '../repositories/claim-document.repo';
import { ClaimEventRepository } from '../repositories/claim-event.repo';
import { ClaimFraudSignalRepository } from '../repositories/claim-fraud-signal.repo';
import { ClaimLinkRepository } from '../repositories/claim-link.repo';
import { ClaimReviewRepository } from '../repositories/claim-review.repo';
import { ClaimSettlementFlagRepository } from '../repositories/claim-settlement-flag.repo';
import { GuaranteeLetterRepository } from '../repositories/guarantee-letter.repo';
import { MedicalCaseRepository } from '../repositories/medical-case.repo';
import { MedicalCaseEventRepository } from '../repositories/medical-case-event.repo';
import { MedicalProviderRepository } from '../repositories/medical-provider.repo';
import { MedicalUnderwritingCaseRepository } from '../repositories/medical-underwriting-case.repo';
import { MedicalUnderwritingOutcomeRepository } from '../repositories/medical-underwriting-outcome.repo';
import { MedicalUnderwritingTermRepository } from '../repositories/medical-underwriting-term.repo';
import { MedicalUnderwritingCurrentOutcomeRepository } from '../repositories/medical-underwriting-current-outcome.repo';
import { MedicalUnderwritingEvidenceRepository } from '../repositories/medical-underwriting-evidence.repo';
import { ClaimSubmitDto } from '../dtos/claim-submit.dto';
import { ClaimAssignReviewerDto } from '../dtos/claim-assign-reviewer.dto';
import { ClaimDocumentDto } from '../dtos/claim-document.dto';
import { FraudSignalDto } from '../dtos/fraud-signal.dto';
import { ClaimApproveDto } from '../dtos/claim-approve.dto';
import { ClaimRejectDto } from '../dtos/claim-reject.dto';
import { ClaimSettleDto } from '../dtos/claim-settle.dto';
import { GuaranteeLetterIssueDto } from '../dtos/guarantee-letter-issue.dto';
import { MedicalCaseCreateDto } from '../dtos/medical-case-create.dto';
import { MedicalCaseUpdateDto } from '../dtos/medical-case-update.dto';
import { UnderwritingDecisionDto } from '../dtos/underwriting-decision.dto';
import { UnderwritingEvidenceDto } from '../dtos/underwriting-evidence.dto';
import { MedicalProviderCreateDto } from '../dtos/medical-provider-create.dto';
import { MedicalProviderUpdateDto } from '../dtos/medical-provider-update.dto';
import { UnderwritingCaseCreateDto } from '../dtos/underwriting-case-create.dto';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * Claim Workflow Service
 * Implements claim commands following the workflow discipline:
 * Guard → Write → Emit → Commit
 *
 * Based on specs/claim/claim.pillar.v2.yml
 */
@Injectable()
export class ClaimWorkflowService {
  constructor(
    private readonly txService: TransactionService,
    private readonly outboxService: OutboxService,
    private readonly claimCaseRepo: ClaimCaseRepository,
    private readonly claimSeqRepo: ClaimCaseNumberSequenceRepository,
    private readonly claimDocRepo: ClaimDocumentRepository,
    private readonly claimEventRepo: ClaimEventRepository,
    private readonly fraudSignalRepo: ClaimFraudSignalRepository,
    private readonly claimLinkRepo: ClaimLinkRepository,
    private readonly claimReviewRepo: ClaimReviewRepository,
    private readonly settlementFlagRepo: ClaimSettlementFlagRepository,
    private readonly glRepo: GuaranteeLetterRepository,
    private readonly medicalCaseRepo: MedicalCaseRepository,
    private readonly medicalCaseEventRepo: MedicalCaseEventRepository,
    private readonly medicalProviderRepo: MedicalProviderRepository,
    private readonly underwritingCaseRepo: MedicalUnderwritingCaseRepository,
    private readonly underwritingOutcomeRepo: MedicalUnderwritingOutcomeRepository,
    private readonly underwritingTermRepo: MedicalUnderwritingTermRepository,
    private readonly underwritingCurrentOutcomeRepo: MedicalUnderwritingCurrentOutcomeRepository,
    private readonly underwritingEvidenceRepo: MedicalUnderwritingEvidenceRepository,
  ) {}

  /**
   * Helper: Format Date object or string to MySQL DATE format (YYYY-MM-DD)
   * Returns Date type for TypeScript compatibility but contains formatted string
   */
  private formatDateOnly(date: Date | string): any {
    if (!date) return null;

    // Convert to Date object if string
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * SUBMIT CLAIM COMMAND
   * Source: specs/claim/claim.pillar.v2.yml lines 1932-1968
   *
   * HTTP: POST /api/v1/claim/submit
   */
  async submitClaim(
    request: ClaimSubmitDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: Check for duplicate claim (same insurant, admission date, hospital)
      const duplicateCheck = await queryRunner.manager.query(
        `SELECT id FROM claim_case
         WHERE insurant_person_id = ?
           AND admission_date = ?
           AND hospital_name = ?
         LIMIT 1`,
        [
          Number(request.insurantPersonId),
          this.formatDateOnly(request.admissionDate),
          request.hospitalName,
        ]
      );

      if (duplicateCheck.length > 0) {
        throw new ConflictException({
          code: 'DUPLICATE_CLAIM',
          message: `Duplicate claim found for insurant ${request.insurantPersonId} at ${request.hospitalName} on ${request.admissionDate}`,
        });
      }

      // GUARD: Validate policy exists and is active (readonly cross-plugin check)
      const policyCheck = await queryRunner.manager.query(
        `SELECT id, status FROM policy WHERE id IN (
          SELECT DISTINCT policy_id FROM policy_member
          WHERE person_id = ? AND status = 'active'
        ) AND status = 'active' LIMIT 1`,
        [Number(request.insurantPersonId)]
      );

      if (policyCheck.length === 0) {
        throw new NotFoundException({
          code: 'NO_ACTIVE_POLICY',
          message: `No active policy found for insurant ${request.insurantPersonId}`,
        });
      }

      // WRITE: Generate claim number using sequence
      const currentYear = new Date().getFullYear();

      // Atomic increment using ON DUPLICATE KEY UPDATE
      await queryRunner.manager.query(
        `INSERT INTO claim_case_number_sequence (claim_year, next_seq)
         VALUES (?, 1)
         ON DUPLICATE KEY UPDATE next_seq = next_seq + 1`,
        [currentYear]
      );

      const seqResult = await queryRunner.manager.query(
        `SELECT next_seq FROM claim_case_number_sequence WHERE claim_year = ?`,
        [currentYear]
      );

      const claimSeq = seqResult[0]?.next_seq || 1;
      const claimNumber = `CL-${currentYear}-${String(claimSeq).padStart(5, '0')}`;

      // WRITE: Create claim case
      const claimId = await this.claimCaseRepo.create(
        {
          claim_number: claimNumber,
          claim_year: currentYear,
          claim_seq: claimSeq,
          account_id: Number(request.accountId),
          claimant_person_id: Number(request.claimantPersonId),
          insurant_person_id: Number(request.insurantPersonId),
          claim_type: request.claimType,
          status: 'submitted',
          hospital_name: request.hospitalName,
          admission_date: this.formatDateOnly(request.admissionDate),
          discharge_date: request.dischargeDate ? this.formatDateOnly(request.dischargeDate) : null,
          diagnosis: request.diagnosis,
          treatment_type: request.treatmentType,
          requested_amount: String(request.requestedAmount),
          submitted_at: new Date(),
        },
        queryRunner,
      );

      // WRITE: Add documents if provided
      if (request.documents && request.documents.length > 0) {
        for (const doc of request.documents) {
          await this.claimDocRepo.create(
            {
              claim_id: claimId,
              file_upload_id: Number(doc.fileUploadId),
              document_type: doc.documentType,
              uploaded_by: actor.actor_user_id ? Number(actor.actor_user_id) : null,
            },
            queryRunner,
          );
        }
      }

      // WRITE: Record claim event
      await this.claimEventRepo.create(
        {
          claim_id: claimId,
          event_type: 'CLAIM_SUBMITTED',
          to_status: 'submitted',
          actor_type: (actor.actor_role as 'user' | 'system' | 'admin') || 'system',
          actor_id: actor.actor_user_id ? Number(actor.actor_user_id) : null,
        },
        queryRunner,
      );

      // EMIT: CLAIM_SUBMITTED event
      await this.outboxService.enqueue(
        {
          event_name: 'CLAIM_SUBMITTED',
          event_version: 1,
          aggregate_type: 'CLAIM_CASE',
          aggregate_id: String(claimId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `submit-claim-${claimId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-submit-claim-${claimId}`,
          payload: {
            claim_id: claimId,
            claim_number: claimNumber,
            account_id: request.accountId,
            claimant_person_id: request.claimantPersonId,
            insurant_person_id: request.insurantPersonId,
            claim_type: request.claimType,
            requested_amount: request.requestedAmount,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        claim_id: claimId,
        claim_number: claimNumber,
      };
    });

    return result;
  }

  /**
   * ASSIGN REVIEWER COMMAND
   * Source: specs/claim/claim.pillar.v2.yml lines 1969-1996
   *
   * HTTP: POST /api/v1/claim/:claimId/assign-reviewer
   */
  async assignReviewer(
    claimId: number,
    request: ClaimAssignReviewerDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: claim
      const claim = await this.claimCaseRepo.findById(claimId, queryRunner);
      if (!claim) {
        throw new NotFoundException({
          code: 'CLAIM_NOT_FOUND',
          message: `Claim with id ${claimId} not found`,
        });
      }

      // GUARD: Claim must be in submitted or under_review status
      if (!['submitted', 'under_review'].includes(claim.status)) {
        throw new ConflictException({
          code: 'INVALID_CLAIM_STATUS',
          message: `Claim must be in submitted or under_review status to assign reviewer`,
        });
      }

      // GUARD: Validate reviewer exists (readonly check)
      const reviewerCheck = await queryRunner.manager.query(
        `SELECT id FROM user WHERE id = ? AND status = 'active' LIMIT 1`,
        [Number(request.reviewerId)]
      );

      if (reviewerCheck.length === 0) {
        throw new NotFoundException({
          code: 'REVIEWER_NOT_FOUND',
          message: `Reviewer with id ${request.reviewerId} not found`,
        });
      }

      // WRITE: Update claim status
      await this.claimCaseRepo.update(
        claimId,
        {
          status: 'under_review',
        },
        queryRunner,
      );

      // WRITE: Create review record
      const reviewId = await this.claimReviewRepo.create(
        {
          claim_id: claimId,
          reviewer_id: Number(request.reviewerId),
          reviewer_role: request.reviewerRole,
          decision: 'pending',
        },
        queryRunner,
      );

      // WRITE: Record event
      await this.claimEventRepo.create(
        {
          claim_id: claimId,
          event_type: 'CLAIM_REVIEWER_ASSIGNED',
          from_status: claim.status,
          to_status: 'under_review',
          actor_type: (actor.actor_role as 'user' | 'system' | 'admin') || 'system',
          actor_id: actor.actor_user_id ? Number(actor.actor_user_id) : null,
        },
        queryRunner,
      );

      // EMIT: CLAIM_REVIEWER_ASSIGNED event
      await this.outboxService.enqueue(
        {
          event_name: 'CLAIM_REVIEWER_ASSIGNED',
          event_version: 1,
          aggregate_type: 'CLAIM_CASE',
          aggregate_id: String(claimId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `assign-reviewer-${claimId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-assign-reviewer-${claimId}`,
          payload: {
            claim_id: claimId,
            reviewer_id: request.reviewerId,
            review_id: reviewId,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        claim_id: claimId,
        reviewer_id: request.reviewerId,
      };
    });

    return result;
  }

  /**
   * ADD DOCUMENT COMMAND
   * Source: specs/claim/claim.pillar.v2.yml lines 1997-2021
   *
   * HTTP: POST /api/v1/claim/:claimId/documents/add
   */
  async addDocument(
    claimId: number,
    request: ClaimDocumentDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: claim
      const claim = await this.claimCaseRepo.findById(claimId, queryRunner);
      if (!claim) {
        throw new NotFoundException({
          code: 'CLAIM_NOT_FOUND',
          message: `Claim with id ${claimId} not found`,
        });
      }

      // GUARD: Claim must not be cancelled
      if (claim.status === 'cancelled') {
        throw new ConflictException({
          code: 'CLAIM_CANCELLED',
          message: `Cannot add documents to cancelled claim`,
        });
      }

      // GUARD: Validate file_upload exists (readonly check)
      const fileCheck = await queryRunner.manager.query(
        `SELECT id FROM file_upload WHERE id = ? LIMIT 1`,
        [Number(request.fileUploadId)]
      );

      if (fileCheck.length === 0) {
        throw new NotFoundException({
          code: 'FILE_NOT_FOUND',
          message: `File upload with id ${request.fileUploadId} not found`,
        });
      }

      // WRITE: Add document
      const documentId = await this.claimDocRepo.create(
        {
          claim_id: claimId,
          file_upload_id: Number(request.fileUploadId),
          document_type: request.documentType,
          uploaded_by: actor.actor_user_id ? Number(actor.actor_user_id) : null,
        },
        queryRunner,
      );

      // WRITE: Record event
      await this.claimEventRepo.create(
        {
          claim_id: claimId,
          event_type: 'CLAIM_DOCUMENT_ADDED',
          actor_type: (actor.actor_role as 'user' | 'system' | 'admin') || 'system',
          actor_id: actor.actor_user_id ? Number(actor.actor_user_id) : null,
        },
        queryRunner,
      );

      // EMIT: CLAIM_DOCUMENT_ADDED event
      await this.outboxService.enqueue(
        {
          event_name: 'CLAIM_DOCUMENT_ADDED',
          event_version: 1,
          aggregate_type: 'CLAIM_CASE',
          aggregate_id: String(claimId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `add-document-${claimId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-add-document-${claimId}`,
          payload: {
            claim_id: claimId,
            document_id: documentId,
            document_type: request.documentType,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        claim_id: claimId,
        document_id: documentId,
      };
    });

    return result;
  }

  /**
   * RECORD FRAUD SIGNAL COMMAND
   * Source: specs/claim/claim.pillar.v2.yml lines 2022-2044
   *
   * HTTP: POST /api/v1/claim/:claimId/fraud-signal/record
   */
  async recordFraudSignal(
    claimId: number,
    request: FraudSignalDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: claim
      const claim = await this.claimCaseRepo.findById(claimId, queryRunner);
      if (!claim) {
        throw new NotFoundException({
          code: 'CLAIM_NOT_FOUND',
          message: `Claim with id ${claimId} not found`,
        });
      }

      // WRITE: Record fraud signal
      const signalId = await this.fraudSignalRepo.create(
        {
          claim_id: claimId,
          signal_type: request.signalType,
          signal_score: request.signalScore,
          signal_payload: request.signalPayload || null,
        },
        queryRunner,
      );

      // EMIT: Event only if high-risk score (>= 75)
      if (request.signalScore >= 75) {
        await this.outboxService.enqueue(
          {
            event_name: 'CLAIM_FRAUD_SIGNAL_RECORDED',
            event_version: 1,
            aggregate_type: 'CLAIM_CASE',
            aggregate_id: String(claimId),
            actor_user_id: actor.actor_user_id,
            occurred_at: new Date(),
            correlation_id: actor.correlation_id || `fraud-signal-${claimId}-${Date.now()}`,
            causation_id: actor.causation_id || `cmd-fraud-signal-${claimId}`,
            payload: {
              claim_id: claimId,
              signal_id: signalId,
              signal_type: request.signalType,
              signal_score: request.signalScore,
            },
            dedupe_key: idempotencyKey,
          },
          queryRunner,
        );
      }

      return {
        claim_id: claimId,
        signal_id: signalId,
      };
    });

    return result;
  }

  /**
   * APPROVE CLAIM COMMAND
   * Source: specs/claim/claim.pillar.v2.yml lines 2045-2074
   *
   * HTTP: POST /api/v1/claim/:claimId/approve
   */
  async approveClaim(
    claimId: number,
    request: ClaimApproveDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: claim
      const claim = await this.claimCaseRepo.findById(claimId, queryRunner);
      if (!claim) {
        throw new NotFoundException({
          code: 'CLAIM_NOT_FOUND',
          message: `Claim with id ${claimId} not found`,
        });
      }

      // GUARD: Claim must be under_review
      if (claim.status !== 'under_review') {
        throw new ConflictException({
          code: 'INVALID_CLAIM_STATUS',
          message: `Claim must be under_review to approve`,
        });
      }

      // GUARD: Approved amount must not exceed requested amount
      if (request.approvedAmount > parseFloat(claim.requested_amount)) {
        throw new BadRequestException({
          code: 'AMOUNT_EXCEEDS_REQUESTED',
          message: `Approved amount ${request.approvedAmount} exceeds requested amount ${claim.requested_amount}`,
        });
      }

      // WRITE: Update claim
      await this.claimCaseRepo.update(
        claimId,
        {
          status: 'approved',
          approved_amount: String(request.approvedAmount),
          decided_at: new Date(),
        },
        queryRunner,
      );

      // WRITE: Update review record
      const reviewResult = await queryRunner.manager.query(
        `SELECT id FROM claim_review WHERE claim_id = ? ORDER BY created_at DESC LIMIT 1`,
        [claimId]
      );

      if (reviewResult.length > 0) {
        await this.claimReviewRepo.update(
          reviewResult[0].id,
          {
            decision: 'approved',
            decision_note: request.decisionNote || null,
            decided_at: new Date(),
          },
          queryRunner,
        );
      }

      // WRITE: Record event
      await this.claimEventRepo.create(
        {
          claim_id: claimId,
          event_type: 'CLAIM_APPROVED',
          from_status: 'under_review',
          to_status: 'approved',
          actor_type: (actor.actor_role as 'user' | 'system' | 'admin') || 'system',
          actor_id: actor.actor_user_id ? Number(actor.actor_user_id) : null,
        },
        queryRunner,
      );

      // EMIT: CLAIM_APPROVED event
      await this.outboxService.enqueue(
        {
          event_name: 'CLAIM_APPROVED',
          event_version: 1,
          aggregate_type: 'CLAIM_CASE',
          aggregate_id: String(claimId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `approve-claim-${claimId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-approve-claim-${claimId}`,
          payload: {
            claim_id: claimId,
            approved_amount: request.approvedAmount,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        claim_id: claimId,
        approved_amount: request.approvedAmount,
      };
    });

    return result;
  }

  /**
   * REJECT CLAIM COMMAND
   * Source: specs/claim/claim.pillar.v2.yml lines 2075-2099
   *
   * HTTP: POST /api/v1/claim/:claimId/reject
   */
  async rejectClaim(
    claimId: number,
    request: ClaimRejectDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: claim
      const claim = await this.claimCaseRepo.findById(claimId, queryRunner);
      if (!claim) {
        throw new NotFoundException({
          code: 'CLAIM_NOT_FOUND',
          message: `Claim with id ${claimId} not found`,
        });
      }

      // GUARD: Claim must be under_review
      if (claim.status !== 'under_review') {
        throw new ConflictException({
          code: 'INVALID_CLAIM_STATUS',
          message: `Claim must be under_review to reject`,
        });
      }

      // WRITE: Update claim
      await this.claimCaseRepo.update(
        claimId,
        {
          status: 'rejected',
          rejection_reason: request.rejectionReason,
          decided_at: new Date(),
        },
        queryRunner,
      );

      // WRITE: Update review record
      const reviewResult = await queryRunner.manager.query(
        `SELECT id FROM claim_review WHERE claim_id = ? ORDER BY created_at DESC LIMIT 1`,
        [claimId]
      );

      if (reviewResult.length > 0) {
        await this.claimReviewRepo.update(
          reviewResult[0].id,
          {
            decision: 'rejected',
            decision_note: request.decisionNote || null,
            decided_at: new Date(),
          },
          queryRunner,
        );
      }

      // WRITE: Record event
      await this.claimEventRepo.create(
        {
          claim_id: claimId,
          event_type: 'CLAIM_REJECTED',
          from_status: 'under_review',
          to_status: 'rejected',
          actor_type: (actor.actor_role as 'user' | 'system' | 'admin') || 'system',
          actor_id: actor.actor_user_id ? Number(actor.actor_user_id) : null,
        },
        queryRunner,
      );

      // EMIT: CLAIM_REJECTED event
      await this.outboxService.enqueue(
        {
          event_name: 'CLAIM_REJECTED',
          event_version: 1,
          aggregate_type: 'CLAIM_CASE',
          aggregate_id: String(claimId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `reject-claim-${claimId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-reject-claim-${claimId}`,
          payload: {
            claim_id: claimId,
            rejection_reason: request.rejectionReason,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        claim_id: claimId,
      };
    });

    return result;
  }

  /**
   * SETTLE CLAIM COMMAND
   * Source: specs/claim/claim.pillar.v2.yml lines 2100-2126
   *
   * HTTP: POST /api/v1/claim/:claimId/settle
   */
  async settleClaim(
    claimId: number,
    request: ClaimSettleDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: claim
      const claim = await this.claimCaseRepo.findById(claimId, queryRunner);
      if (!claim) {
        throw new NotFoundException({
          code: 'CLAIM_NOT_FOUND',
          message: `Claim with id ${claimId} not found`,
        });
      }

      // GUARD: Claim must be approved
      if (claim.status !== 'approved') {
        throw new ConflictException({
          code: 'INVALID_CLAIM_STATUS',
          message: `Claim must be approved to settle`,
        });
      }

      // GUARD: Settlement amount must match approved amount
      if (!claim.approved_amount || request.settlementAmount !== parseFloat(claim.approved_amount)) {
        throw new BadRequestException({
          code: 'SETTLEMENT_AMOUNT_MISMATCH',
          message: `Settlement amount ${request.settlementAmount} does not match approved amount ${claim.approved_amount}`,
        });
      }

      // WRITE: Update claim status
      await this.claimCaseRepo.update(
        claimId,
        {
          status: 'settled',
        },
        queryRunner,
      );

      // WRITE: Create settlement flag
      await this.settlementFlagRepo.create(
        {
          claim_id: claimId,
          period_key: request.periodKey,
          eligible: 1,
          reason_code: 'OK',
          set_by_actor_type: (actor.actor_role as 'user' | 'system' | 'admin') || 'system',
          set_by_actor_id: actor.actor_user_id ? Number(actor.actor_user_id) : null,
          set_at: new Date(),
        },
        queryRunner,
      );

      // WRITE: Record event
      await this.claimEventRepo.create(
        {
          claim_id: claimId,
          event_type: 'CLAIM_SETTLED',
          from_status: 'approved',
          to_status: 'settled',
          actor_type: (actor.actor_role as 'user' | 'system' | 'admin') || 'system',
          actor_id: actor.actor_user_id ? Number(actor.actor_user_id) : null,
        },
        queryRunner,
      );

      // EMIT: CLAIM_SETTLED event
      await this.outboxService.enqueue(
        {
          event_name: 'CLAIM_SETTLED',
          event_version: 1,
          aggregate_type: 'CLAIM_CASE',
          aggregate_id: String(claimId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `settle-claim-${claimId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-settle-claim-${claimId}`,
          payload: {
            claim_id: claimId,
            claim_number: claim.claim_number,
            approved_amount: claim.approved_amount ? parseFloat(claim.approved_amount) : 0,
            period_key: request.periodKey,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        claim_id: claimId,
      };
    });

    return result;
  }

  /**
   * ISSUE GUARANTEE LETTER COMMAND
   * Source: specs/claim/claim.pillar.v2.yml lines 2127-2150
   *
   * HTTP: POST /api/v1/guarantee-letter/issue
   */
  async issueGuaranteeLetter(
    request: GuaranteeLetterIssueDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: medical case
      const medicalCase = await this.medicalCaseRepo.findById(
        Number(request.medicalCaseId),
        queryRunner,
      );
      if (!medicalCase) {
        throw new NotFoundException({
          code: 'MEDICAL_CASE_NOT_FOUND',
          message: `Medical case with id ${request.medicalCaseId} not found`,
        });
      }

      // GUARD: Medical case must be in reported or admitted status
      if (!['reported', 'admitted'].includes(medicalCase.status)) {
        throw new ConflictException({
          code: 'INVALID_CASE_STATUS',
          message: `Medical case must be in reported or admitted status to issue GL`,
        });
      }

      // GUARD: Validate policy is active (readonly check)
      const policyCheck = await queryRunner.manager.query(
        `SELECT id, status FROM policy WHERE id = ? AND status = 'active' LIMIT 1`,
        [medicalCase.policy_id]
      );

      if (policyCheck.length === 0) {
        throw new NotFoundException({
          code: 'POLICY_NOT_ACTIVE',
          message: `Policy ${medicalCase.policy_id} is not active`,
        });
      }

      // Generate GL number
      const glNumber = `GL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // WRITE: Create guarantee letter
      const glId = await this.glRepo.create(
        {
          medical_case_id: Number(request.medicalCaseId),
          gl_number: glNumber,
          approved_limit_amount: String(request.approvedLimitAmount),
          currency: request.currency || 'MYR',
          status: 'issued',
          valid_from: request.validFrom,
          valid_until: request.validUntil,
          coverage_snapshot: request.coverageSnapshot || null,
          issued_at: new Date(),
        },
        queryRunner,
      );

      // EMIT: GUARANTEE_LETTER_ISSUED event
      await this.outboxService.enqueue(
        {
          event_name: 'GUARANTEE_LETTER_ISSUED',
          event_version: 1,
          aggregate_type: 'GUARANTEE_LETTER',
          aggregate_id: String(glId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `issue-gl-${glId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-issue-gl-${glId}`,
          payload: {
            gl_id: glId,
            gl_number: glNumber,
            medical_case_id: request.medicalCaseId,
            approved_limit_amount: request.approvedLimitAmount,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        gl_id: glId,
        gl_number: glNumber,
      };
    });

    return result;
  }

  /**
   * CANCEL GUARANTEE LETTER COMMAND
   * Source: specs/claim/claim.pillar.v2.yml lines 2151-2169
   *
   * HTTP: POST /api/v1/guarantee-letter/:glId/cancel
   */
  async cancelGuaranteeLetter(
    glId: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: guarantee letter
      const gl = await this.glRepo.findById(glId, queryRunner);
      if (!gl) {
        throw new NotFoundException({
          code: 'GL_NOT_FOUND',
          message: `Guarantee letter with id ${glId} not found`,
        });
      }

      // GUARD: GL must be in issued or active status
      if (!['issued', 'active'].includes(gl.status)) {
        throw new ConflictException({
          code: 'INVALID_GL_STATUS',
          message: `GL must be in issued or active status to cancel`,
        });
      }

      // WRITE: Update GL status
      await this.glRepo.update(
        glId,
        {
          status: 'cancelled',
          cancelled_at: new Date(),
        },
        queryRunner,
      );

      // EMIT: GUARANTEE_LETTER_CANCELLED event
      await this.outboxService.enqueue(
        {
          event_name: 'GUARANTEE_LETTER_CANCELLED',
          event_version: 1,
          aggregate_type: 'GUARANTEE_LETTER',
          aggregate_id: String(glId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `cancel-gl-${glId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-cancel-gl-${glId}`,
          payload: {
            gl_id: glId,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        gl_id: glId,
      };
    });

    return result;
  }

  /**
   * CREATE MEDICAL CASE COMMAND
   * Source: specs/claim/claim.pillar.v2.yml lines 2170-2192
   *
   * HTTP: POST /api/v1/medical-case/create
   */
  async createMedicalCase(
    request: MedicalCaseCreateDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: Validate account, person, policy, and provider exist
      const accountCheck = await queryRunner.manager.query(
        `SELECT id FROM account WHERE id = ? LIMIT 1`,
        [Number(request.accountId)]
      );
      if (accountCheck.length === 0) {
        throw new NotFoundException({
          code: 'ACCOUNT_NOT_FOUND',
          message: `Account with id ${request.accountId} not found`,
        });
      }

      const personCheck = await queryRunner.manager.query(
        `SELECT id FROM person WHERE id = ? LIMIT 1`,
        [Number(request.personId)]
      );
      if (personCheck.length === 0) {
        throw new NotFoundException({
          code: 'PERSON_NOT_FOUND',
          message: `Person with id ${request.personId} not found`,
        });
      }

      const policyCheck = await queryRunner.manager.query(
        `SELECT id FROM policy WHERE id = ? LIMIT 1`,
        [Number(request.policyId)]
      );
      if (policyCheck.length === 0) {
        throw new NotFoundException({
          code: 'POLICY_NOT_FOUND',
          message: `Policy with id ${request.policyId} not found`,
        });
      }

      const providerCheck = await this.medicalProviderRepo.findById(
        Number(request.providerId),
        queryRunner,
      );
      if (!providerCheck) {
        throw new NotFoundException({
          code: 'PROVIDER_NOT_FOUND',
          message: `Provider with id ${request.providerId} not found`,
        });
      }

      // Generate case number
      const caseNumber = `MC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // WRITE: Create medical case
      const caseId = await this.medicalCaseRepo.create(
        {
          case_number: caseNumber,
          account_id: Number(request.accountId),
          person_id: Number(request.personId),
          policy_id: Number(request.policyId),
          provider_id: Number(request.providerId),
          admission_type: request.admissionType || 'emergency',
          diagnosis_code: request.diagnosisCode || null,
          diagnosis_text: request.diagnosisText || null,
          admitted_at: request.admittedAt || null,
          status: 'reported',
        },
        queryRunner,
      );

      // WRITE: Record medical case event
      await this.medicalCaseEventRepo.create(
        {
          medical_case_id: caseId,
          event_type: 'MEDICAL_CASE_CREATED',
          actor_type: (actor.actor_role as 'user' | 'system' | 'admin') || 'system',
          actor_id: actor.actor_user_id ? Number(actor.actor_user_id) : null,
          payload_json: {
            case_number: caseNumber,
          },
          occurred_at: new Date(),
        },
        queryRunner,
      );

      // EMIT: MEDICAL_CASE_CREATED event
      await this.outboxService.enqueue(
        {
          event_name: 'MEDICAL_CASE_CREATED',
          event_version: 1,
          aggregate_type: 'MEDICAL_CASE',
          aggregate_id: String(caseId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `create-medical-case-${caseId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-create-medical-case-${caseId}`,
          payload: {
            medical_case_id: caseId,
            case_number: caseNumber,
            policy_id: request.policyId,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        medical_case_id: caseId,
        case_number: caseNumber,
      };
    });

    return result;
  }

  /**
   * UPDATE MEDICAL CASE COMMAND
   * Source: specs/claim/claim.pillar.v2.yml lines 2193-2214
   *
   * HTTP: POST /api/v1/medical-case/:medicalCaseId/update
   */
  async updateMedicalCase(
    medicalCaseId: number,
    request: MedicalCaseUpdateDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: medical case
      const medicalCase = await this.medicalCaseRepo.findById(medicalCaseId, queryRunner);
      if (!medicalCase) {
        throw new NotFoundException({
          code: 'MEDICAL_CASE_NOT_FOUND',
          message: `Medical case with id ${medicalCaseId} not found`,
        });
      }

      // WRITE: Update medical case
      await this.medicalCaseRepo.update(
        medicalCaseId,
        {
          status: request.status,
          discharged_at: request.dischargedAt || null,
        },
        queryRunner,
      );

      // WRITE: Record medical case event
      await this.medicalCaseEventRepo.create(
        {
          medical_case_id: medicalCaseId,
          event_type: 'MEDICAL_CASE_UPDATED',
          actor_type: (actor.actor_role as 'user' | 'system' | 'admin') || 'system',
          actor_id: actor.actor_user_id ? Number(actor.actor_user_id) : null,
          payload_json: {
            status: request.status,
            discharged_at: request.dischargedAt,
          },
          occurred_at: new Date(),
        },
        queryRunner,
      );

      // EMIT: MEDICAL_CASE_UPDATED event
      await this.outboxService.enqueue(
        {
          event_name: 'MEDICAL_CASE_UPDATED',
          event_version: 1,
          aggregate_type: 'MEDICAL_CASE',
          aggregate_id: String(medicalCaseId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `update-medical-case-${medicalCaseId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-update-medical-case-${medicalCaseId}`,
          payload: {
            medical_case_id: medicalCaseId,
            status: request.status,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        medical_case_id: medicalCaseId,
      };
    });

    return result;
  }

  /**
   * RECORD UNDERWRITING DECISION COMMAND
   * Source: specs/claim/claim.pillar.v2.yml lines 2215-2248
   *
   * HTTP: POST /api/v1/underwriting/:caseId/record-decision
   */
  async recordUnderwritingDecision(
    caseId: number,
    request: UnderwritingDecisionDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: underwriting case
      const uwCase = await this.underwritingCaseRepo.findById(caseId, queryRunner);
      if (!uwCase) {
        throw new NotFoundException({
          code: 'CASE_NOT_FOUND',
          message: `Underwriting case with id ${caseId} not found`,
        });
      }

      // GUARD: Case must be in open or pending status
      if (!['open', 'pending'].includes(uwCase.status)) {
        throw new ConflictException({
          code: 'INVALID_CASE_STATUS',
          message: `Case must be in open or pending status to record decision`,
        });
      }

      // READ: Get next version number
      const versionResult = await queryRunner.manager.query(
        `SELECT COALESCE(MAX(version_no), 0) + 1 as next_version
         FROM medical_underwriting_outcome
         WHERE case_id = ?`,
        [caseId]
      );
      const versionNo = versionResult[0]?.next_version || 1;

      // WRITE: Create outcome
      const outcomeId = await this.underwritingOutcomeRepo.create(
        {
          case_id: caseId,
          version_no: versionNo,
          decision: request.decision,
          risk_level: request.riskLevel || null,
          overall_loading_factor: request.overallLoadingFactor ? String(request.overallLoadingFactor) : null,
          decision_reason_json: request.decisionReasonJson || null,
          decision_notes: request.decisionNotes || null,
          effective_from: new Date(),
          decided_by_user_id: actor.actor_user_id ? Number(actor.actor_user_id) : null,
          decided_at: new Date(),
        },
        queryRunner,
      );

      // WRITE: Insert terms if provided
      if (request.terms && request.terms.length > 0) {
        for (const term of request.terms) {
          await this.underwritingTermRepo.create(
            {
              outcome_id: outcomeId,
              term_type: term.termType,
              code: term.code || null,
              name: term.name || null,
              value_factor: term.valueFactor ? String(term.valueFactor) : null,
              value_amount: term.valueAmount ? String(term.valueAmount) : null,
              value_days: term.valueDays || null,
              value_text: term.valueText || null,
            },
            queryRunner,
          );
        }
      }

      // WRITE: Upsert current outcome
      await this.underwritingCurrentOutcomeRepo.upsert(
        {
          subject_ref_id: uwCase.subject_ref_id,
          context_ref_id: uwCase.context_ref_id,
          case_id: caseId,
          outcome_id: outcomeId,
        },
        queryRunner,
      );

      // WRITE: Update case status
      await this.underwritingCaseRepo.update(
        caseId,
        {
          status: 'decided',
          closed_at: new Date(),
        },
        queryRunner,
      );

      // EMIT: UNDERWRITING_DECISION_RECORDED event
      await this.outboxService.enqueue(
        {
          event_name: 'UNDERWRITING_DECISION_RECORDED',
          event_version: 1,
          aggregate_type: 'MEDICAL_UNDERWRITING_CASE',
          aggregate_id: String(caseId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `underwriting-decision-${caseId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-underwriting-decision-${caseId}`,
          payload: {
            case_id: caseId,
            outcome_id: outcomeId,
            version_no: versionNo,
            decision: request.decision,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        case_id: caseId,
        outcome_id: outcomeId,
        version_no: versionNo,
      };
    });

    return result;
  }

  /**
   * ADD UNDERWRITING EVIDENCE COMMAND
   * Source: specs/claim/claim.pillar.v2.yml lines 2249-2268
   *
   * HTTP: POST /api/v1/underwriting/:caseId/add-evidence
   */
  async addUnderwritingEvidence(
    caseId: number,
    request: UnderwritingEvidenceDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: underwriting case
      const uwCase = await this.underwritingCaseRepo.findById(caseId, queryRunner);
      if (!uwCase) {
        throw new NotFoundException({
          code: 'CASE_NOT_FOUND',
          message: `Underwriting case with id ${caseId} not found`,
        });
      }

      // WRITE: Add evidence
      const evidenceId = await this.underwritingEvidenceRepo.create(
        {
          case_id: caseId,
          evidence_type: request.evidenceType || 'survey',
          survey_response_id: request.surveyResponseId ? Number(request.surveyResponseId) : null,
          note: request.note || null,
          meta_json: request.metaJson || null,
        },
        queryRunner,
      );

      // EMIT: UNDERWRITING_EVIDENCE_ADDED event
      await this.outboxService.enqueue(
        {
          event_name: 'UNDERWRITING_EVIDENCE_ADDED',
          event_version: 1,
          aggregate_type: 'MEDICAL_UNDERWRITING_CASE',
          aggregate_id: String(caseId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `add-evidence-${caseId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-add-evidence-${caseId}`,
          payload: {
            case_id: caseId,
            evidence_id: evidenceId,
            evidence_type: request.evidenceType,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        case_id: caseId,
        evidence_id: evidenceId,
      };
    });

    return result;
  }

  /**
   * CREATE MEDICAL PROVIDER COMMAND
   * Source: specs/claim/claim.pillar.v2.yml MedicalProvider.Create
   *
   * HTTP: POST /api/v1/admin/medical-provider
   */
  async createMedicalProvider(
    request: MedicalProviderCreateDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: Validate provider_code is unique
      const existingProvider = await queryRunner.manager.query(
        `SELECT id FROM medical_provider WHERE provider_code = ? LIMIT 1`,
        [request.providerCode]
      );

      if (existingProvider.length > 0) {
        throw new ConflictException({
          code: 'PROVIDER_CODE_EXISTS',
          message: `Provider with code ${request.providerCode} already exists`,
        });
      }

      // WRITE: Create medical provider
      const providerId = await this.medicalProviderRepo.create(
        {
          provider_code: request.providerCode,
          name: request.name,
          type: request.type || 'hospital',
          panel_status: request.panelStatus || 'active',
          contact_phone: request.contactPhone || null,
          contact_email: request.contactEmail || null,
          meta_json: request.metaJson || null,
        },
        queryRunner,
      );

      // EMIT: MEDICAL_PROVIDER_CREATED event
      await this.outboxService.enqueue(
        {
          event_name: 'MEDICAL_PROVIDER_CREATED',
          event_version: 1,
          aggregate_type: 'MEDICAL_PROVIDER',
          aggregate_id: String(providerId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `create-provider-${providerId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-create-provider-${providerId}`,
          payload: {
            provider_id: providerId,
            provider_code: request.providerCode,
            name: request.name,
            type: request.type || 'hospital',
            panel_status: request.panelStatus || 'active',
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        provider_id: providerId,
        provider_code: request.providerCode,
      };
    });

    return result;
  }

  /**
   * UPDATE MEDICAL PROVIDER COMMAND
   * Source: specs/claim/claim.pillar.v2.yml MedicalProvider.Update
   *
   * HTTP: PUT /api/v1/admin/medical-provider/:providerId
   */
  async updateMedicalProvider(
    providerId: number,
    request: MedicalProviderUpdateDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: Validate provider exists
      const provider = await this.medicalProviderRepo.findById(providerId, queryRunner);

      if (!provider) {
        throw new NotFoundException({
          code: 'PROVIDER_NOT_FOUND',
          message: `Provider with id ${providerId} not found`,
        });
      }

      // WRITE: Update medical provider
      const updateData: any = {};
      if (request.name !== undefined) updateData.name = request.name;
      if (request.type !== undefined) updateData.type = request.type;
      if (request.panelStatus !== undefined) updateData.panel_status = request.panelStatus;
      if (request.contactPhone !== undefined) updateData.contact_phone = request.contactPhone;
      if (request.contactEmail !== undefined) updateData.contact_email = request.contactEmail;
      if (request.metaJson !== undefined) updateData.meta_json = request.metaJson;

      if (Object.keys(updateData).length > 0) {
        await this.medicalProviderRepo.update(providerId, updateData, queryRunner);
      }

      // EMIT: MEDICAL_PROVIDER_UPDATED event
      await this.outboxService.enqueue(
        {
          event_name: 'MEDICAL_PROVIDER_UPDATED',
          event_version: 1,
          aggregate_type: 'MEDICAL_PROVIDER',
          aggregate_id: String(providerId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `update-provider-${providerId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-update-provider-${providerId}`,
          payload: {
            provider_id: providerId,
            updated_fields: Object.keys(updateData),
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        provider_id: providerId,
      };
    });

    return result;
  }

  /**
   * DEACTIVATE MEDICAL PROVIDER COMMAND
   * Source: specs/claim/claim.pillar.v2.yml MedicalProvider.Deactivate
   *
   * HTTP: POST /api/v1/admin/medical-provider/:providerId/deactivate
   */
  async deactivateMedicalProvider(
    providerId: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: Validate provider exists
      const provider = await this.medicalProviderRepo.findById(providerId, queryRunner);

      if (!provider) {
        throw new NotFoundException({
          code: 'PROVIDER_NOT_FOUND',
          message: `Provider with id ${providerId} not found`,
        });
      }

      // GUARD: Validate no active medical cases with this provider
      const activeCases = await queryRunner.manager.query(
        `SELECT id FROM medical_case
         WHERE provider_id = ?
           AND status IN ('reported', 'admitted', 'in_treatment')
         LIMIT 1`,
        [providerId]
      );

      if (activeCases.length > 0) {
        throw new ConflictException({
          code: 'PROVIDER_HAS_ACTIVE_CASES',
          message: `Cannot deactivate provider ${providerId} - has active medical cases`,
        });
      }

      // WRITE: Update panel_status to inactive
      await this.medicalProviderRepo.update(
        providerId,
        { panel_status: 'inactive' },
        queryRunner,
      );

      // EMIT: MEDICAL_PROVIDER_DEACTIVATED event
      await this.outboxService.enqueue(
        {
          event_name: 'MEDICAL_PROVIDER_DEACTIVATED',
          event_version: 1,
          aggregate_type: 'MEDICAL_PROVIDER',
          aggregate_id: String(providerId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `deactivate-provider-${providerId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-deactivate-provider-${providerId}`,
          payload: {
            provider_id: providerId,
            provider_code: provider.provider_code,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        provider_id: providerId,
      };
    });

    return result;
  }

  /**
   * CREATE UNDERWRITING CASE COMMAND
   * Source: specs/claim/claim.pillar.v2.yml Underwriting.CreateCase
   *
   * HTTP: POST /api/v1/underwriting/create
   */
  async createUnderwritingCase(
    request: UnderwritingCaseCreateDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: Validate subject_ref_id exists in resource_ref
      const subjectRef = await queryRunner.manager.query(
        `SELECT id FROM resource_ref WHERE id = ? LIMIT 1`,
        [request.subjectRefId]
      );

      if (subjectRef.length === 0) {
        throw new NotFoundException({
          code: 'SUBJECT_REF_NOT_FOUND',
          message: `Subject reference with id ${request.subjectRefId} not found`,
        });
      }

      // GUARD: Validate context_ref_id exists if provided
      if (request.contextRefId) {
        const contextRef = await queryRunner.manager.query(
          `SELECT id FROM resource_ref WHERE id = ? LIMIT 1`,
          [request.contextRefId]
        );

        if (contextRef.length === 0) {
          throw new NotFoundException({
            code: 'CONTEXT_REF_NOT_FOUND',
            message: `Context reference with id ${request.contextRefId} not found`,
          });
        }
      }

      // Generate case number (UW-YYYY-NNNN format)
      const year = new Date().getFullYear();
      const lastCase = await queryRunner.manager.query(
        `SELECT case_no FROM medical_underwriting_case
         WHERE case_no LIKE ?
         ORDER BY id DESC
         LIMIT 1`,
        [`UW-${year}-%`]
      );

      let seq = 1;
      if (lastCase.length > 0) {
        const match = lastCase[0].case_no.match(/UW-\d{4}-(\d+)/);
        if (match) {
          seq = parseInt(match[1], 10) + 1;
        }
      }
      const caseNo = `UW-${year}-${String(seq).padStart(4, '0')}`;

      // WRITE: Create underwriting case
      const caseId = await this.underwritingCaseRepo.create(
        {
          subject_ref_id: request.subjectRefId,
          context_ref_id: request.contextRefId || null,
          case_no: caseNo,
          status: 'open',
          channel: request.channel || null,
          priority: request.priority || 'normal',
          created_by_user_id: Number(actor.actor_user_id),
          assigned_to_user_id: request.assignedToUserId || null,
          meta_json: request.metaJson || null,
        },
        queryRunner,
      );

      // EMIT: UNDERWRITING_CASE_CREATED event
      await this.outboxService.enqueue(
        {
          event_name: 'UNDERWRITING_CASE_CREATED',
          event_version: 1,
          aggregate_type: 'MEDICAL_UNDERWRITING_CASE',
          aggregate_id: String(caseId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `create-underwriting-${caseId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-create-underwriting-${caseId}`,
          payload: {
            case_id: caseId,
            case_no: caseNo,
            subject_ref_id: request.subjectRefId,
            context_ref_id: request.contextRefId,
            status: 'open',
            priority: request.priority || 'normal',
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        case_id: caseId,
        case_no: caseNo,
      };
    });

    return result;
  }
}
