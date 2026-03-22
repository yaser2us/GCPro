import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { OutboxService } from '../../../corekit/services/outbox.service';
import { PaymentMethodRepository } from '../repositories/payment-method.repo';
import { PaymentIntentRepository } from '../repositories/payment-intent.repo';
import { PaymentReceiptRepository } from '../repositories/payment-receipt.repo';
import { PaymentAttemptRepository } from '../repositories/payment-attempt.repo';
import { PaymentEventRepository } from '../repositories/payment-event.repo';
import { PaymentWebhookInboxRepository } from '../repositories/payment-webhook-inbox.repo';
import { PaymentMethodCreateDto } from '../dtos/payment-method-create.dto';
import { PaymentIntentCreateDto } from '../dtos/payment-intent-create.dto';
import { PaymentIntentConfirmDto } from '../dtos/payment-intent-confirm.dto';
import { WebhookReceiveDto } from '../dtos/webhook-receive.dto';
import type { Actor } from '../../../corekit/types/actor.type';
import { v4 as uuidv4 } from 'uuid';

/**
 * Payment Workflow Service
 * Implements payment commands following the workflow discipline:
 * Guard → Write → Emit → Commit
 *
 * Based on specs/payment/payment.pillar.v2.yml
 */
@Injectable()
export class PaymentWorkflowService {
  constructor(
    private readonly txService: TransactionService,
    private readonly outboxService: OutboxService,
    private readonly paymentMethodRepo: PaymentMethodRepository,
    private readonly paymentIntentRepo: PaymentIntentRepository,
    private readonly paymentReceiptRepo: PaymentReceiptRepository,
    private readonly paymentAttemptRepo: PaymentAttemptRepository,
    private readonly paymentEventRepo: PaymentEventRepository,
    private readonly webhookInboxRepo: PaymentWebhookInboxRepository,
  ) {}

  /**
   * CREATE PAYMENT METHOD COMMAND
   * Source: specs/payment/payment.pillar.v2.yml PaymentMethod.Create
   *
   * HTTP: POST /api/v1/payment-method
   */
  async createPaymentMethod(
    request: PaymentMethodCreateDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: Validate account exists
      const accountExists = await queryRunner.manager.query(
        `SELECT id FROM account WHERE id = ? LIMIT 1`,
        [request.accountId]
      );

      if (accountExists.length === 0) {
        throw new NotFoundException({
          code: 'ACCOUNT_NOT_FOUND',
          message: `Account with id ${request.accountId} not found`,
        });
      }

      // GUARD: Validate person exists if person_id provided
      if (request.personId) {
        const personExists = await queryRunner.manager.query(
          `SELECT id FROM person WHERE id = ? LIMIT 1`,
          [request.personId]
        );

        if (personExists.length === 0) {
          throw new NotFoundException({
            code: 'PERSON_NOT_FOUND',
            message: `Person with id ${request.personId} not found`,
          });
        }
      }

      // WRITE: Create payment method
      const paymentMethodId = await this.paymentMethodRepo.create(
        {
          account_id: request.accountId,
          person_id: request.personId || null,
          provider: request.provider,
          method_type: request.methodType,
          status: 'active',
          provider_customer_ref: request.providerCustomerRef || null,
          provider_method_ref: request.providerMethodRef || null,
          brand: request.brand || null,
          last4: request.last4 || null,
          exp_mm: request.expMm || null,
          exp_yyyy: request.expYyyy || null,
          consent_json: request.consentJson || null,
          meta_json: request.metaJson || null,
        },
        queryRunner,
      );

      // EMIT: PAYMENT_METHOD_CREATED event
      await this.outboxService.enqueue(
        {
          event_name: 'PAYMENT_METHOD_CREATED',
          event_version: 1,
          aggregate_type: 'PAYMENT_METHOD',
          aggregate_id: String(paymentMethodId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `create-payment-method-${paymentMethodId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-create-payment-method-${paymentMethodId}`,
          payload: {
            payment_method_id: paymentMethodId,
            account_id: request.accountId,
            provider: request.provider,
            method_type: request.methodType,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        paymentMethodId,
        status: 'active',
      };
    });

    return result;
  }

  /**
   * DELETE PAYMENT METHOD COMMAND
   * Source: specs/payment/payment.pillar.v2.yml PaymentMethod.Delete
   *
   * HTTP: DELETE /api/v1/payment-method/:paymentMethodId
   */
  async deletePaymentMethod(
    paymentMethodId: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: Validate payment method exists
      const paymentMethod = await this.paymentMethodRepo.findById(paymentMethodId, queryRunner);

      if (!paymentMethod) {
        throw new NotFoundException({
          code: 'PAYMENT_METHOD_NOT_FOUND',
          message: `Payment method with id ${paymentMethodId} not found`,
        });
      }

      // WRITE: Set status to deleted
      await this.paymentMethodRepo.update(
        paymentMethodId,
        { status: 'deleted' },
        queryRunner,
      );

      // EMIT: PAYMENT_METHOD_DELETED event
      await this.outboxService.enqueue(
        {
          event_name: 'PAYMENT_METHOD_DELETED',
          event_version: 1,
          aggregate_type: 'PAYMENT_METHOD',
          aggregate_id: String(paymentMethodId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `delete-payment-method-${paymentMethodId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-delete-payment-method-${paymentMethodId}`,
          payload: {
            payment_method_id: paymentMethodId,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        paymentMethodId,
        status: 'deleted',
      };
    });

    return result;
  }

  /**
   * CREATE PAYMENT INTENT COMMAND
   * Source: specs/payment/payment.pillar.v2.yml PaymentIntent.Create
   *
   * HTTP: POST /api/v1/payment-intent
   */
  async createPaymentIntent(
    request: PaymentIntentCreateDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: Validate account exists
      const accountExists = await queryRunner.manager.query(
        `SELECT id FROM account WHERE id = ? LIMIT 1`,
        [request.accountId]
      );

      if (accountExists.length === 0) {
        throw new NotFoundException({
          code: 'ACCOUNT_NOT_FOUND',
          message: `Account with id ${request.accountId} not found`,
        });
      }

      // GUARD: Validate amount > 0
      if (request.amount <= 0) {
        throw new BadRequestException({
          code: 'INVALID_AMOUNT',
          message: 'Payment amount must be greater than 0',
        });
      }

      // GUARD: Validate payment method if provided
      if (request.paymentMethodId) {
        const paymentMethod = await this.paymentMethodRepo.findById(request.paymentMethodId, queryRunner);

        if (!paymentMethod) {
          throw new NotFoundException({
            code: 'PAYMENT_METHOD_NOT_FOUND',
            message: `Payment method with id ${request.paymentMethodId} not found`,
          });
        }
      }

      // Generate unique intent_key
      const intentKey = `PIY-${uuidv4()}`;

      // WRITE: Create payment intent
      const intentId = await this.paymentIntentRepo.create(
        {
          intent_key: intentKey,
          intent_type: request.intentType,
          account_id: request.accountId,
          person_id: request.personId || null,
          payment_method_id: request.paymentMethodId || null,
          amount: request.amount,
          currency: request.currency || 'MYR',
          status: 'created',
          purpose_code: request.purposeCode || 'other',
          ref_type: request.refType || null,
          ref_id: request.refId || null,
          idempotency_key: idempotencyKey,
          provider: request.provider || null,
          return_url: request.returnUrl || null,
          callback_url: request.callbackUrl || null,
          meta_json: request.metaJson || null,
        },
        queryRunner,
      );

      // WRITE: Log CREATED event
      await this.paymentEventRepo.create(
        {
          intent_id: intentId,
          event_type: 'created',
          actor_type: 'user',
          actor_id: Number(actor.actor_user_id),
          occurred_at: new Date(),
        },
        queryRunner,
      );

      // EMIT: PAYMENT_INTENT_CREATED event
      await this.outboxService.enqueue(
        {
          event_name: 'PAYMENT_INTENT_CREATED',
          event_version: 1,
          aggregate_type: 'PAYMENT_INTENT',
          aggregate_id: String(intentId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `create-payment-intent-${intentId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-create-payment-intent-${intentId}`,
          payload: {
            intent_id: intentId,
            intent_key: intentKey,
            amount: request.amount,
            currency: request.currency || 'MYR',
            purpose_code: request.purposeCode || 'other',
            ref_type: request.refType,
            ref_id: request.refId,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        intentId,
        intentKey,
        amount: request.amount,
        currency: request.currency || 'MYR',
        status: 'created',
      };
    });

    return result;
  }

  /**
   * CONFIRM PAYMENT INTENT COMMAND
   * Source: specs/payment/payment.pillar.v2.yml PaymentIntent.Confirm
   *
   * HTTP: POST /api/v1/payment-intent/:intentId/confirm
   */
  async confirmPaymentIntent(
    intentId: number,
    request: PaymentIntentConfirmDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: Validate intent exists and status is created
      const intent = await this.paymentIntentRepo.findById(intentId, queryRunner);

      if (!intent) {
        throw new NotFoundException({
          code: 'PAYMENT_INTENT_NOT_FOUND',
          message: `Payment intent with id ${intentId} not found`,
        });
      }

      if (intent.status !== 'created') {
        throw new ConflictException({
          code: 'INVALID_INTENT_STATUS',
          message: `Payment intent must be in 'created' status, currently '${intent.status}'`,
        });
      }

      // GUARD: Validate payment method if provided
      if (request.paymentMethodId) {
        const paymentMethod = await this.paymentMethodRepo.findById(request.paymentMethodId, queryRunner);

        if (!paymentMethod) {
          throw new NotFoundException({
            code: 'PAYMENT_METHOD_NOT_FOUND',
            message: `Payment method with id ${request.paymentMethodId} not found`,
          });
        }
      }

      // WRITE: Update intent status to processing
      await this.paymentIntentRepo.update(
        intentId,
        {
          status: 'processing',
          payment_method_id: request.paymentMethodId || intent.payment_method_id,
          provider: request.provider,
          return_url: request.returnUrl || intent.return_url,
        },
        queryRunner,
      );

      // WRITE: Create first payment attempt
      const attemptId = await this.paymentAttemptRepo.create(
        {
          intent_id: intentId,
          attempt_no: 1,
          status: 'initiated',
          provider: request.provider,
          started_at: new Date(),
        },
        queryRunner,
      );

      // WRITE: Log CONFIRMED event
      await this.paymentEventRepo.create(
        {
          intent_id: intentId,
          event_type: 'confirmed',
          actor_type: 'user',
          actor_id: Number(actor.actor_user_id),
          occurred_at: new Date(),
        },
        queryRunner,
      );

      // EMIT: PAYMENT_INTENT_CONFIRMED event
      await this.outboxService.enqueue(
        {
          event_name: 'PAYMENT_INTENT_CONFIRMED',
          event_version: 1,
          aggregate_type: 'PAYMENT_INTENT',
          aggregate_id: String(intentId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `confirm-payment-intent-${intentId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-confirm-payment-intent-${intentId}`,
          payload: {
            intent_id: intentId,
            intent_key: intent.intent_key,
            provider: request.provider,
            attempt_id: attemptId,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        intentId,
        intentKey: intent.intent_key,
        status: 'processing',
        providerIntentRef: null, // Will be updated after provider API call
        redirectUrl: null, // Will be provided by provider
      };
    });

    return result;
  }

  /**
   * MARK PAYMENT INTENT AS SUCCEEDED COMMAND
   * Source: specs/payment/payment.pillar.v2.yml PaymentIntent.MarkSucceeded
   *
   * HTTP: POST /api/v1/payment-intent/:intentId/mark-succeeded
   */
  async markPaymentIntentSucceeded(
    intentId: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: Validate intent exists and status is processing
      const intent = await this.paymentIntentRepo.findById(intentId, queryRunner);

      if (!intent) {
        throw new NotFoundException({
          code: 'PAYMENT_INTENT_NOT_FOUND',
          message: `Payment intent with id ${intentId} not found`,
        });
      }

      if (intent.status !== 'processing') {
        throw new ConflictException({
          code: 'INVALID_INTENT_STATUS',
          message: `Payment intent must be in 'processing' status, currently '${intent.status}'`,
        });
      }

      const succeededAt = new Date();

      // WRITE: Update intent status to succeeded
      await this.paymentIntentRepo.update(
        intentId,
        {
          status: 'succeeded',
          succeeded_at: succeededAt,
        },
        queryRunner,
      );

      // WRITE: Mark latest attempt as succeeded
      const latestAttempt = await this.paymentAttemptRepo.findLatestByIntentId(intentId, queryRunner);
      if (latestAttempt) {
        await this.paymentAttemptRepo.update(
          latestAttempt.id,
          {
            status: 'succeeded',
            completed_at: succeededAt,
          },
          queryRunner,
        );
      }

      // WRITE: Log SUCCEEDED event
      await this.paymentEventRepo.create(
        {
          intent_id: intentId,
          event_type: 'succeeded',
          actor_type: 'system',
          actor_id: Number(actor.actor_user_id),
          occurred_at: succeededAt,
        },
        queryRunner,
      );

      // EMIT: PAYMENT_SUCCEEDED event
      await this.outboxService.enqueue(
        {
          event_name: 'PAYMENT_SUCCEEDED',
          event_version: 1,
          aggregate_type: 'PAYMENT_INTENT',
          aggregate_id: String(intentId),
          actor_user_id: actor.actor_user_id,
          occurred_at: succeededAt,
          correlation_id: actor.correlation_id || `succeeded-payment-intent-${intentId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-succeeded-payment-intent-${intentId}`,
          payload: {
            intent_id: intentId,
            intent_key: intent.intent_key,
            amount: Number(intent.amount),
            currency: intent.currency,
            purpose_code: intent.purpose_code,
            ref_type: intent.ref_type,
            ref_id: intent.ref_id,
            account_id: intent.account_id,
            succeeded_at: succeededAt,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        intentId,
        status: 'succeeded',
        succeededAt,
      };
    });

    return result;
  }

  /**
   * MARK PAYMENT INTENT AS FAILED COMMAND
   * Source: specs/payment/payment.pillar.v2.yml PaymentIntent.MarkFailed
   *
   * HTTP: POST /api/v1/payment-intent/:intentId/mark-failed
   */
  async markPaymentIntentFailed(
    intentId: number,
    failureCode: string,
    failureMessage: string,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: Validate intent exists and status is processing
      const intent = await this.paymentIntentRepo.findById(intentId, queryRunner);

      if (!intent) {
        throw new NotFoundException({
          code: 'PAYMENT_INTENT_NOT_FOUND',
          message: `Payment intent with id ${intentId} not found`,
        });
      }

      if (intent.status !== 'processing') {
        throw new ConflictException({
          code: 'INVALID_INTENT_STATUS',
          message: `Payment intent must be in 'processing' status, currently '${intent.status}'`,
        });
      }

      const failedAt = new Date();

      // WRITE: Update intent status to failed
      await this.paymentIntentRepo.update(
        intentId,
        {
          status: 'failed',
          failed_at: failedAt,
        },
        queryRunner,
      );

      // WRITE: Mark latest attempt as failed
      const latestAttempt = await this.paymentAttemptRepo.findLatestByIntentId(intentId, queryRunner);
      if (latestAttempt) {
        await this.paymentAttemptRepo.update(
          latestAttempt.id,
          {
            status: 'failed',
            failure_code: failureCode,
            failure_message: failureMessage,
            completed_at: failedAt,
          },
          queryRunner,
        );
      }

      // WRITE: Log FAILED event
      await this.paymentEventRepo.create(
        {
          intent_id: intentId,
          event_type: 'failed',
          actor_type: 'system',
          actor_id: Number(actor.actor_user_id),
          payload_json: {
            failure_code: failureCode,
            failure_message: failureMessage,
          },
          occurred_at: failedAt,
        },
        queryRunner,
      );

      // EMIT: PAYMENT_FAILED event
      await this.outboxService.enqueue(
        {
          event_name: 'PAYMENT_FAILED',
          event_version: 1,
          aggregate_type: 'PAYMENT_INTENT',
          aggregate_id: String(intentId),
          actor_user_id: actor.actor_user_id,
          occurred_at: failedAt,
          correlation_id: actor.correlation_id || `failed-payment-intent-${intentId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-failed-payment-intent-${intentId}`,
          payload: {
            intent_id: intentId,
            intent_key: intent.intent_key,
            failure_code: failureCode,
            failure_message: failureMessage,
            failed_at: failedAt,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        intentId,
        status: 'failed',
        failedAt,
        failureCode,
      };
    });

    return result;
  }

  /**
   * CANCEL PAYMENT INTENT COMMAND
   * Source: specs/payment/payment.pillar.v2.yml PaymentIntent.Cancel
   *
   * HTTP: POST /api/v1/payment-intent/:intentId/cancel
   */
  async cancelPaymentIntent(
    intentId: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: Validate intent exists and status is created or processing
      const intent = await this.paymentIntentRepo.findById(intentId, queryRunner);

      if (!intent) {
        throw new NotFoundException({
          code: 'PAYMENT_INTENT_NOT_FOUND',
          message: `Payment intent with id ${intentId} not found`,
        });
      }

      if (!['created', 'processing'].includes(intent.status)) {
        throw new ConflictException({
          code: 'INVALID_INTENT_STATUS',
          message: `Payment intent must be in 'created' or 'processing' status, currently '${intent.status}'`,
        });
      }

      // WRITE: Update intent status to cancelled
      await this.paymentIntentRepo.update(
        intentId,
        { status: 'cancelled' },
        queryRunner,
      );

      // WRITE: Log CANCELLED event
      await this.paymentEventRepo.create(
        {
          intent_id: intentId,
          event_type: 'cancelled',
          actor_type: 'user',
          actor_id: Number(actor.actor_user_id),
          occurred_at: new Date(),
        },
        queryRunner,
      );

      // EMIT: PAYMENT_CANCELLED event
      await this.outboxService.enqueue(
        {
          event_name: 'PAYMENT_CANCELLED',
          event_version: 1,
          aggregate_type: 'PAYMENT_INTENT',
          aggregate_id: String(intentId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `cancel-payment-intent-${intentId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-cancel-payment-intent-${intentId}`,
          payload: {
            intent_id: intentId,
            intent_key: intent.intent_key,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        intentId,
        status: 'cancelled',
      };
    });

    return result;
  }

  /**
   * ISSUE RECEIPT COMMAND
   * Source: specs/payment/payment.pillar.v2.yml Receipt.Issue
   *
   * HTTP: POST /api/v1/receipt
   */
  async issueReceipt(
    intentId: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: Validate payment intent exists and status is succeeded
      const intent = await this.paymentIntentRepo.findById(intentId, queryRunner);

      if (!intent) {
        throw new NotFoundException({
          code: 'PAYMENT_INTENT_NOT_FOUND',
          message: `Payment intent with id ${intentId} not found`,
        });
      }

      if (intent.status !== 'succeeded') {
        throw new ConflictException({
          code: 'PAYMENT_NOT_SUCCEEDED',
          message: `Payment intent must be succeeded to issue receipt, currently '${intent.status}'`,
        });
      }

      // GUARD: Validate no receipt exists for this payment intent
      const existingReceipt = await queryRunner.manager.query(
        `SELECT id FROM payment_receipt WHERE payment_intent_id = ? LIMIT 1`,
        [intentId]
      );

      if (existingReceipt.length > 0) {
        throw new ConflictException({
          code: 'RECEIPT_ALREADY_EXISTS',
          message: `Receipt already exists for payment intent ${intentId}`,
        });
      }

      // Generate receipt number
      const year = new Date().getFullYear();
      const lastReceipt = await queryRunner.manager.query(
        `SELECT receipt_no FROM payment_receipt
         WHERE receipt_no LIKE ?
         ORDER BY id DESC
         LIMIT 1`,
        [`RCP-${year}-%`]
      );

      let seq = 1;
      if (lastReceipt.length > 0) {
        const match = lastReceipt[0].receipt_no.match(/RCP-\d{4}-(\d+)/);
        if (match) {
          seq = parseInt(match[1], 10) + 1;
        }
      }
      const receiptNo = `RCP-${year}-${String(seq).padStart(6, '0')}`;
      const issuedAt = new Date();

      // WRITE: Create receipt
      const receiptId = await this.paymentReceiptRepo.create(
        {
          receipt_no: receiptNo,
          account_id: intent.account_id,
          person_id: intent.person_id,
          payment_intent_id: intentId,
          ledger_txn_id: intent.ledger_txn_id,
          amount: intent.amount,
          currency: intent.currency,
          title: `Payment Receipt for ${intent.purpose_code}`,
          description: `Receipt for payment ${intent.intent_key}`,
          status: 'issued',
          issued_at: issuedAt,
          ref_type: intent.ref_type,
          ref_id: intent.ref_id,
          meta_json: null,
        },
        queryRunner,
      );

      // EMIT: PAYMENT_RECEIPT_ISSUED event
      await this.outboxService.enqueue(
        {
          event_name: 'PAYMENT_RECEIPT_ISSUED',
          event_version: 1,
          aggregate_type: 'PAYMENT_RECEIPT',
          aggregate_id: String(receiptId),
          actor_user_id: actor.actor_user_id,
          occurred_at: issuedAt,
          correlation_id: actor.correlation_id || `issue-receipt-${receiptId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-issue-receipt-${receiptId}`,
          payload: {
            receipt_id: receiptId,
            receipt_no: receiptNo,
            payment_intent_id: intentId,
            amount: Number(intent.amount),
            issued_at: issuedAt,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        receiptId,
        receiptNo,
        amount: Number(intent.amount),
        issuedAt,
      };
    });

    return result;
  }

  /**
   * VOID RECEIPT COMMAND
   * Source: specs/payment/payment.pillar.v2.yml Receipt.Void
   *
   * HTTP: POST /api/v1/receipt/:receiptId/void
   */
  async voidReceipt(
    receiptId: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: Validate receipt exists and status is issued
      const receipt = await this.paymentReceiptRepo.findById(receiptId, queryRunner);

      if (!receipt) {
        throw new NotFoundException({
          code: 'RECEIPT_NOT_FOUND',
          message: `Receipt with id ${receiptId} not found`,
        });
      }

      if (receipt.status !== 'issued') {
        throw new ConflictException({
          code: 'RECEIPT_NOT_ISSUED',
          message: `Receipt must be in 'issued' status, currently '${receipt.status}'`,
        });
      }

      const voidedAt = new Date();

      // WRITE: Update receipt status to voided
      await this.paymentReceiptRepo.update(
        receiptId,
        {
          status: 'voided',
          voided_at: voidedAt,
        },
        queryRunner,
      );

      // EMIT: PAYMENT_RECEIPT_VOIDED event
      await this.outboxService.enqueue(
        {
          event_name: 'PAYMENT_RECEIPT_VOIDED',
          event_version: 1,
          aggregate_type: 'PAYMENT_RECEIPT',
          aggregate_id: String(receiptId),
          actor_user_id: actor.actor_user_id,
          occurred_at: voidedAt,
          correlation_id: actor.correlation_id || `void-receipt-${receiptId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-void-receipt-${receiptId}`,
          payload: {
            receipt_id: receiptId,
            receipt_no: receipt.receipt_no,
            voided_at: voidedAt,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        receiptId,
        status: 'voided',
        voidedAt,
      };
    });

    return result;
  }

  /**
   * RECEIVE WEBHOOK COMMAND
   * Source: specs/payment/payment.pillar.v2.yml Webhook.Receive
   *
   * HTTP: POST /api/v1/webhook/:provider
   */
  async receiveWebhook(
    provider: string,
    request: WebhookReceiveDto,
    receivedIp: string,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // Verify webhook signature (simplified - real implementation would call provider SDK)
      const signatureStatus = request.signature ? 'valid' : 'unknown';

      // WRITE: Insert webhook
      const webhookId = await this.webhookInboxRepo.create(
        {
          provider,
          provider_event_id: request.providerEventId || null,
          status: 'new',
          signature_status: signatureStatus,
          received_ip: receivedIp,
          headers_json: request.headersJson || null,
          payload_json: request.payloadJson,
          idempotency_key: idempotencyKey,
          received_at: new Date(),
        },
        queryRunner,
      );

      // EMIT: WEBHOOK_RECEIVED event
      await this.outboxService.enqueue(
        {
          event_name: 'WEBHOOK_RECEIVED',
          event_version: 1,
          aggregate_type: 'WEBHOOK_INBOX',
          aggregate_id: String(webhookId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `receive-webhook-${webhookId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-receive-webhook-${webhookId}`,
          payload: {
            webhook_id: webhookId,
            provider,
            provider_event_id: request.providerEventId,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        webhookId,
        status: 'new',
      };
    });

    return result;
  }
}
