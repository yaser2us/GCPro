import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { OutboxService } from '../../../corekit/services/outbox.service';
import type { Actor } from '../../../corekit/types/actor.type';
import { WalletDepositIntentRepository } from '../repositories/wallet-deposit-intent.repo';
import { WalletSpendIntentRepository } from '../repositories/wallet-spend-intent.repo';
import { WalletWithdrawalRequestRepository } from '../repositories/wallet-withdrawal-request.repo';
import { WalletHoldRepository } from '../repositories/wallet-hold.repo';
import { WalletPayoutAttemptRepository } from '../repositories/wallet-payout-attempt.repo';
import { WalletBatchRepository } from '../repositories/wallet-batch.repo';
import { WalletBatchItemRepository } from '../repositories/wallet-batch-item.repo';
import { WalletRuleSetRepository } from '../repositories/wallet-rule-set.repo';
import { WalletRuleRepository } from '../repositories/wallet-rule.repo';
import { WalletThresholdRuleRepository } from '../repositories/wallet-threshold-rule.repo';
import { WalletThresholdEventRepository } from '../repositories/wallet-threshold-event.repo';
import { WalletPolicyGateRepository } from '../repositories/wallet-policy-gate.repo';
import { DepositIntentCreateDto } from '../dto/deposit-intent-create.dto';
import { SpendIntentCreateDto } from '../dto/spend-intent-create.dto';
import { WithdrawalRequestCreateDto } from '../dto/withdrawal-request-create.dto';
import { WithdrawalRejectDto } from '../dto/withdrawal-reject.dto';
import { WalletHoldCreateDto } from '../dto/wallet-hold-create.dto';
import { PayoutAttemptRecordDto } from '../dto/payout-attempt-record.dto';
import { WalletBatchCreateDto } from '../dto/wallet-batch-create.dto';
import { WalletBatchItemAddDto } from '../dto/wallet-batch-item-add.dto';
import { BatchItemFailDto } from '../dto/batch-item-fail.dto';
import { RuleSetCreateDto } from '../dto/rule-set-create.dto';
import { RuleAddDto } from '../dto/rule-add.dto';
import { ThresholdRuleUpsertDto } from '../dto/threshold-rule-upsert.dto';
import { ThresholdEventRecordDto } from '../dto/threshold-event-record.dto';
import { PolicyGateUpsertDto } from '../dto/policy-gate-upsert.dto';

/**
 * WalletAdvancedWorkflowService
 * Implements all 25 commands for the wallet-advanced pillar.
 * Based on specs/wallet-advanced/wallet-advanced.pillar.v2.yml
 */
@Injectable()
export class WalletAdvancedWorkflowService {
  constructor(
    private readonly txService: TransactionService,
    private readonly outboxService: OutboxService,
    private readonly depositIntentRepo: WalletDepositIntentRepository,
    private readonly spendIntentRepo: WalletSpendIntentRepository,
    private readonly withdrawalRequestRepo: WalletWithdrawalRequestRepository,
    private readonly holdRepo: WalletHoldRepository,
    private readonly payoutAttemptRepo: WalletPayoutAttemptRepository,
    private readonly batchRepo: WalletBatchRepository,
    private readonly batchItemRepo: WalletBatchItemRepository,
    private readonly ruleSetRepo: WalletRuleSetRepository,
    private readonly ruleRepo: WalletRuleRepository,
    private readonly thresholdRuleRepo: WalletThresholdRuleRepository,
    private readonly thresholdEventRepo: WalletThresholdEventRepository,
    private readonly policyGateRepo: WalletPolicyGateRepository,
  ) {}

  // ── DEPOSIT INTENT ─────────────────────────────────────────────────────────

  /** CreateDepositIntent: idempotent via UNIQUE(idempotency_key) */
  async createDepositIntent(
    dto: DepositIntentCreateDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const insertedId = await this.depositIntentRepo.insert(
        {
          wallet_id: dto.wallet_id,
          account_id: dto.account_id,
          amount: dto.amount,
          currency: dto.currency ?? 'MYR',
          status: 'created',
          ref_type: dto.ref_type ?? null,
          ref_id: dto.ref_id ?? null,
          idempotency_key: dto.idempotency_key ?? idempotencyKey,
          meta_json: dto.meta_json ?? null,
        },
        queryRunner,
      );

      let result;
      if (!insertedId) {
        result = await this.depositIntentRepo.findByIdempotencyKey(
          dto.idempotency_key ?? idempotencyKey,
          queryRunner,
        );
      } else {
        result = await this.depositIntentRepo.findById(insertedId, queryRunner);
      }

      await this.outboxService.enqueue(
        {
          event_name: 'DEPOSIT_INTENT_CREATED',
          event_version: 1,
          aggregate_type: 'DEPOSIT_INTENT',
          aggregate_id: String(result!.id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            wallet_id: result!.wallet_id,
            amount: result!.amount,
            currency: result!.currency,
          },
        },
        queryRunner,
      );

      return result;
    });
  }

  /** CompleteDepositIntent: created | pending → completed */
  async completeDepositIntent(
    depositIntentId: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const intent = await this.depositIntentRepo.findById(depositIntentId, queryRunner);

      if (!intent) throw new NotFoundException('DEPOSIT_INTENT_NOT_FOUND');
      if (intent.status !== 'created' && intent.status !== 'pending')
        throw new ConflictException('DEPOSIT_INTENT_NOT_PROCESSABLE');

      await this.depositIntentRepo.update(depositIntentId, { status: 'completed' }, queryRunner);

      await this.outboxService.enqueue(
        {
          event_name: 'DEPOSIT_INTENT_COMPLETED',
          event_version: 1,
          aggregate_type: 'DEPOSIT_INTENT',
          aggregate_id: String(depositIntentId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            wallet_id: intent.wallet_id,
            amount: intent.amount,
            currency: intent.currency,
          },
        },
        queryRunner,
      );

      return this.depositIntentRepo.findById(depositIntentId, queryRunner);
    });
  }

  /** FailDepositIntent: not terminal → failed */
  async failDepositIntent(
    depositIntentId: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const intent = await this.depositIntentRepo.findById(depositIntentId, queryRunner);

      if (!intent) throw new NotFoundException('DEPOSIT_INTENT_NOT_FOUND');
      if (
        intent.status === 'completed' ||
        intent.status === 'failed' ||
        intent.status === 'cancelled'
      )
        throw new ConflictException('DEPOSIT_INTENT_ALREADY_TERMINAL');

      await this.depositIntentRepo.update(depositIntentId, { status: 'failed' }, queryRunner);

      await this.outboxService.enqueue(
        {
          event_name: 'DEPOSIT_INTENT_FAILED',
          event_version: 1,
          aggregate_type: 'DEPOSIT_INTENT',
          aggregate_id: String(depositIntentId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            wallet_id: intent.wallet_id,
            amount: intent.amount,
          },
        },
        queryRunner,
      );

      return this.depositIntentRepo.findById(depositIntentId, queryRunner);
    });
  }

  /** CancelDepositIntent: created → cancelled */
  async cancelDepositIntent(
    depositIntentId: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const intent = await this.depositIntentRepo.findById(depositIntentId, queryRunner);

      if (!intent) throw new NotFoundException('DEPOSIT_INTENT_NOT_FOUND');
      if (intent.status !== 'created')
        throw new ConflictException('DEPOSIT_INTENT_NOT_CANCELLABLE');

      await this.depositIntentRepo.update(depositIntentId, { status: 'cancelled' }, queryRunner);

      await this.outboxService.enqueue(
        {
          event_name: 'DEPOSIT_INTENT_CANCELLED',
          event_version: 1,
          aggregate_type: 'DEPOSIT_INTENT',
          aggregate_id: String(depositIntentId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            wallet_id: intent.wallet_id,
            amount: intent.amount,
          },
        },
        queryRunner,
      );

      return this.depositIntentRepo.findById(depositIntentId, queryRunner);
    });
  }

  // ── SPEND INTENT ───────────────────────────────────────────────────────────

  /** CreateSpendIntent: idempotent via UNIQUE(idempotency_key) */
  async createSpendIntent(
    dto: SpendIntentCreateDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      // H6: Gate check for COIN wallets — only annual_fee purpose is allowed
      if (dto.currency === 'COIN') {
        const purposeCode = dto.purpose_code ?? '';
        const gateCode = purposeGateCode(purposeCode);
        if (gateCode) {
          const gate = await this.policyGateRepo.findByWalletIdAndGateCode(
            dto.wallet_id,
            gateCode,
            queryRunner,
          );
          if (gate && gate.status !== 'on') {
            throw new ForbiddenException('WALLET_OPERATION_NOT_PERMITTED');
          }
        } else if (purposeCode !== 'annual_fee') {
          // Unknown purpose on COIN wallet → deny unless explicitly allowed
          throw new ForbiddenException('WALLET_OPERATION_NOT_PERMITTED');
        }
      }

      const insertedId = await this.spendIntentRepo.insert(
        {
          wallet_id: dto.wallet_id,
          account_id: dto.account_id,
          amount: dto.amount,
          currency: dto.currency ?? 'MYR',
          status: 'created',
          ref_type: dto.ref_type ?? null,
          ref_id: dto.ref_id ?? null,
          idempotency_key: dto.idempotency_key ?? idempotencyKey,
          meta_json: dto.meta_json ?? null,
        },
        queryRunner,
      );

      let result;
      if (!insertedId) {
        result = await this.spendIntentRepo.findByIdempotencyKey(
          dto.idempotency_key ?? idempotencyKey,
          queryRunner,
        );
      } else {
        result = await this.spendIntentRepo.findById(insertedId, queryRunner);
      }

      await this.outboxService.enqueue(
        {
          event_name: 'SPEND_INTENT_CREATED',
          event_version: 1,
          aggregate_type: 'SPEND_INTENT',
          aggregate_id: String(result!.id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            wallet_id: result!.wallet_id,
            amount: result!.amount,
            currency: result!.currency,
          },
        },
        queryRunner,
      );

      return result;
    });
  }

  /** CompleteSpendIntent: created | pending → completed (C8: checks thresholds after completion) */
  async completeSpendIntent(
    spendIntentId: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const intent = await this.spendIntentRepo.findById(spendIntentId, queryRunner);

      if (!intent) throw new NotFoundException('SPEND_INTENT_NOT_FOUND');
      if (intent.status !== 'created' && intent.status !== 'pending')
        throw new ConflictException('SPEND_INTENT_NOT_PROCESSABLE');

      await this.spendIntentRepo.update(spendIntentId, { status: 'completed' }, queryRunner);

      await this.outboxService.enqueue(
        {
          event_name: 'SPEND_INTENT_COMPLETED',
          event_version: 1,
          aggregate_type: 'SPEND_INTENT',
          aggregate_id: String(spendIntentId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            wallet_id: intent.wallet_id,
            amount: intent.amount,
            currency: intent.currency,
          },
        },
        queryRunner,
      );

      // C8: check threshold rules after spend — emit WALLET_THRESHOLD_BREACHED if needed
      await this.checkAndEmitThreshold(intent.wallet_id, actor, idempotencyKey, queryRunner);

      return this.spendIntentRepo.findById(spendIntentId, queryRunner);
    });
  }

  /** C8: Internal — check threshold rules for a wallet and emit WALLET_THRESHOLD_BREACHED if any breached. */
  private async checkAndEmitThreshold(
    walletId: number,
    actor: Actor,
    correlationId: string,
    queryRunner: any,
  ): Promise<void> {
    const [snapshot] = await queryRunner.manager.query(
      `SELECT available_amount FROM wallet_balance_snapshot WHERE wallet_id = ? LIMIT 1`,
      [walletId],
    );
    if (!snapshot) return;

    const available = parseFloat(snapshot.available_amount);

    const rules = await queryRunner.manager.query(
      `SELECT threshold_code, threshold_amount FROM wallet_threshold_rule
       WHERE wallet_id = ? AND status = 'active'`,
      [walletId],
    );

    for (const rule of rules) {
      const threshold = parseFloat(rule.threshold_amount);
      if (available <= threshold) {
        await this.outboxService.enqueue(
          {
            event_name: 'WALLET_THRESHOLD_BREACHED',
            event_version: 1,
            aggregate_type: 'WALLET',
            aggregate_id: String(walletId),
            actor_user_id: actor.actor_user_id,
            occurred_at: new Date(),
            correlation_id: correlationId,
            causation_id: correlationId,
            payload: {
              wallet_id: walletId,
              threshold_code: rule.threshold_code,
              available_amount: String(available),
              threshold_amount: String(threshold),
            },
          },
          queryRunner,
        );
      }
    }
  }

  /** FailSpendIntent: not terminal → failed */
  async failSpendIntent(
    spendIntentId: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const intent = await this.spendIntentRepo.findById(spendIntentId, queryRunner);

      if (!intent) throw new NotFoundException('SPEND_INTENT_NOT_FOUND');
      if (
        intent.status === 'completed' ||
        intent.status === 'failed' ||
        intent.status === 'cancelled'
      )
        throw new ConflictException('SPEND_INTENT_ALREADY_TERMINAL');

      await this.spendIntentRepo.update(spendIntentId, { status: 'failed' }, queryRunner);

      await this.outboxService.enqueue(
        {
          event_name: 'SPEND_INTENT_FAILED',
          event_version: 1,
          aggregate_type: 'SPEND_INTENT',
          aggregate_id: String(spendIntentId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            wallet_id: intent.wallet_id,
            amount: intent.amount,
          },
        },
        queryRunner,
      );

      return this.spendIntentRepo.findById(spendIntentId, queryRunner);
    });
  }

  /** CancelSpendIntent: created → cancelled */
  async cancelSpendIntent(
    spendIntentId: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const intent = await this.spendIntentRepo.findById(spendIntentId, queryRunner);

      if (!intent) throw new NotFoundException('SPEND_INTENT_NOT_FOUND');
      if (intent.status !== 'created')
        throw new ConflictException('SPEND_INTENT_NOT_CANCELLABLE');

      await this.spendIntentRepo.update(spendIntentId, { status: 'cancelled' }, queryRunner);

      await this.outboxService.enqueue(
        {
          event_name: 'SPEND_INTENT_CANCELLED',
          event_version: 1,
          aggregate_type: 'SPEND_INTENT',
          aggregate_id: String(spendIntentId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            wallet_id: intent.wallet_id,
            amount: intent.amount,
          },
        },
        queryRunner,
      );

      return this.spendIntentRepo.findById(spendIntentId, queryRunner);
    });
  }

  // ── WITHDRAWAL REQUEST ─────────────────────────────────────────────────────

  /** RequestWithdrawal: insert a new withdrawal request (H7: rules+fee, M2: KYC+carer gate) */
  async requestWithdrawal(
    dto: WithdrawalRequestCreateDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const reqAmount = parseFloat(dto.amount);

      // M2: KYC gate — user must have verified KYC
      const [kycRow] = await queryRunner.manager.query(
        `SELECT id FROM verification_status
         WHERE account_id = (SELECT account_id FROM wallet WHERE id = ?)
           AND verification_type = 'kyc' AND status = 'verified'
         LIMIT 1`,
        [dto.wallet_id],
      );
      if (!kycRow) {
        throw new ForbiddenException('KYC_REQUIRED');
      }

      // M2: Active carer gate — must have at least one active policy member
      const [carerRow] = await queryRunner.manager.query(
        `SELECT pm.id FROM policy_member pm
         JOIN policy p ON p.id = pm.policy_id
         JOIN account a ON a.id = p.account_id
         JOIN wallet w ON w.account_id = a.id
         WHERE w.id = ? AND pm.status = 'active'
         LIMIT 1`,
        [dto.wallet_id],
      );
      if (!carerRow) {
        throw new ForbiddenException('NO_ACTIVE_CARER');
      }

      // H7: Load active rule set for this wallet
      const ruleSet = await this.ruleSetRepo.findActiveByWalletId(dto.wallet_id, queryRunner);
      let feeAmount = 0;

      if (ruleSet) {
        const rules = await this.ruleRepo.findActiveByRuleSetId(ruleSet.id, queryRunner);
        const ruleMap = new Map(rules.map((r) => [r.rule_code, r]));

        // Minimum withdrawal check
        const minRule = ruleMap.get('min_withdrawal');
        if (minRule && reqAmount < parseFloat(minRule.value_num ?? '0')) {
          throw new BadRequestException(
            `WITHDRAWAL_BELOW_MINIMUM: minimum is ${minRule.value_num}`,
          );
        }

        // Daily withdrawal limit check
        const dailyRule = ruleMap.get('daily_withdrawal_limit');
        if (dailyRule) {
          const [dailyRow] = await queryRunner.manager.query(
            `SELECT COALESCE(SUM(amount), 0) AS total
             FROM wallet_withdrawal_request
             WHERE wallet_id = ? AND DATE(requested_at) = CURDATE()
               AND status NOT IN ('rejected', 'cancelled')`,
            [dto.wallet_id],
          );
          const dailyUsed = parseFloat(dailyRow?.total ?? '0');
          if (dailyUsed + reqAmount > parseFloat(dailyRule.value_num ?? '0')) {
            throw new BadRequestException('WITHDRAWAL_DAILY_LIMIT_EXCEEDED');
          }
        }

        // Monthly withdrawal limit check
        const monthlyRule = ruleMap.get('monthly_withdrawal_limit');
        if (monthlyRule) {
          const [monthlyRow] = await queryRunner.manager.query(
            `SELECT COALESCE(SUM(amount), 0) AS total
             FROM wallet_withdrawal_request
             WHERE wallet_id = ? AND YEAR(requested_at) = YEAR(NOW())
               AND MONTH(requested_at) = MONTH(NOW())
               AND status NOT IN ('rejected', 'cancelled')`,
            [dto.wallet_id],
          );
          const monthlyUsed = parseFloat(monthlyRow?.total ?? '0');
          if (monthlyUsed + reqAmount > parseFloat(monthlyRule.value_num ?? '0')) {
            throw new BadRequestException('WITHDRAWAL_MONTHLY_LIMIT_EXCEEDED');
          }
        }

        // Fee calculation (percentage or flat)
        const feePctRule = ruleMap.get('withdrawal_fee_pct');
        if (feePctRule) {
          feeAmount = reqAmount * (parseFloat(feePctRule.value_num ?? '0') / 100);
        }
        const feeFlatRule = ruleMap.get('withdrawal_fee_flat');
        if (feeFlatRule) {
          feeAmount += parseFloat(feeFlatRule.value_num ?? '0');
        }
      }

      const insertedId = await this.withdrawalRequestRepo.insert(
        {
          wallet_id: dto.wallet_id,
          account_id: dto.account_id,
          bank_profile_id: dto.bank_profile_id,
          amount: dto.amount,
          fee_amount: feeAmount.toFixed(2),
          currency: dto.currency ?? 'MYR',
          status: 'requested',
          requested_at: new Date(),
          meta_json: dto.meta_json ?? null,
        },
        queryRunner,
      );

      const result = await this.withdrawalRequestRepo.findById(insertedId, queryRunner);

      await this.outboxService.enqueue(
        {
          event_name: 'WITHDRAWAL_REQUESTED',
          event_version: 1,
          aggregate_type: 'WITHDRAWAL_REQUEST',
          aggregate_id: String(result!.id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            wallet_id: result!.wallet_id,
            amount: result!.amount,
            fee_amount: result!.fee_amount,
            bank_profile_id: result!.bank_profile_id,
          },
        },
        queryRunner,
      );

      return result;
    });
  }

  /** ApproveWithdrawal: requested → approved */
  async approveWithdrawal(
    withdrawalRequestId: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const wr = await this.withdrawalRequestRepo.findById(withdrawalRequestId, queryRunner);

      if (!wr) throw new NotFoundException('WITHDRAWAL_REQUEST_NOT_FOUND');
      if (wr.status !== 'requested')
        throw new ConflictException('WITHDRAWAL_REQUEST_NOT_PENDING');

      await this.withdrawalRequestRepo.update(
        withdrawalRequestId,
        { status: 'approved', decided_at: new Date() },
        queryRunner,
      );

      await this.outboxService.enqueue(
        {
          event_name: 'WITHDRAWAL_APPROVED',
          event_version: 1,
          aggregate_type: 'WITHDRAWAL_REQUEST',
          aggregate_id: String(withdrawalRequestId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            wallet_id: wr.wallet_id,
            amount: wr.amount,
          },
        },
        queryRunner,
      );

      return this.withdrawalRequestRepo.findById(withdrawalRequestId, queryRunner);
    });
  }

  /** RejectWithdrawal: requested → rejected */
  async rejectWithdrawal(
    withdrawalRequestId: number,
    dto: WithdrawalRejectDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const wr = await this.withdrawalRequestRepo.findById(withdrawalRequestId, queryRunner);

      if (!wr) throw new NotFoundException('WITHDRAWAL_REQUEST_NOT_FOUND');
      if (wr.status !== 'requested')
        throw new ConflictException('WITHDRAWAL_REQUEST_NOT_PENDING');

      await this.withdrawalRequestRepo.update(
        withdrawalRequestId,
        {
          status: 'rejected',
          reject_reason_code: dto.reject_reason_code,
          decided_at: new Date(),
        },
        queryRunner,
      );

      await this.outboxService.enqueue(
        {
          event_name: 'WITHDRAWAL_REJECTED',
          event_version: 1,
          aggregate_type: 'WITHDRAWAL_REQUEST',
          aggregate_id: String(withdrawalRequestId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            wallet_id: wr.wallet_id,
            amount: wr.amount,
            reject_reason_code: dto.reject_reason_code,
          },
        },
        queryRunner,
      );

      return this.withdrawalRequestRepo.findById(withdrawalRequestId, queryRunner);
    });
  }

  /** RecordPayoutAttempt: append-only log — no outbox emit */
  async recordPayoutAttempt(
    withdrawalRequestId: number,
    dto: PayoutAttemptRecordDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const wr = await this.withdrawalRequestRepo.findById(withdrawalRequestId, queryRunner);

      if (!wr) throw new NotFoundException('WITHDRAWAL_REQUEST_NOT_FOUND');
      if (wr.status !== 'approved' && wr.status !== 'processing')
        throw new ConflictException('WITHDRAWAL_REQUEST_NOT_APPROVABLE');

      const insertedId = await this.payoutAttemptRepo.insert(
        {
          withdrawal_request_id: withdrawalRequestId,
          provider: dto.provider,
          provider_ref: dto.provider_ref ?? null,
          status: dto.status,
          failure_code: dto.failure_code ?? null,
          request_json: dto.request_json ?? null,
          response_json: dto.response_json ?? null,
          attempted_at: new Date(),
        },
        queryRunner,
      );

      return this.payoutAttemptRepo.findById(insertedId, queryRunner);
    });
  }

  /** CompleteWithdrawal: approved | processing → completed */
  async completeWithdrawal(
    withdrawalRequestId: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const wr = await this.withdrawalRequestRepo.findById(withdrawalRequestId, queryRunner);

      if (!wr) throw new NotFoundException('WITHDRAWAL_REQUEST_NOT_FOUND');
      if (wr.status !== 'approved' && wr.status !== 'processing')
        throw new ConflictException('WITHDRAWAL_REQUEST_NOT_PROCESSABLE');

      await this.withdrawalRequestRepo.update(withdrawalRequestId, { status: 'completed' }, queryRunner);

      await this.outboxService.enqueue(
        {
          event_name: 'WITHDRAWAL_COMPLETED',
          event_version: 1,
          aggregate_type: 'WITHDRAWAL_REQUEST',
          aggregate_id: String(withdrawalRequestId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            wallet_id: wr.wallet_id,
            amount: wr.amount,
            bank_profile_id: wr.bank_profile_id,
          },
        },
        queryRunner,
      );

      return this.withdrawalRequestRepo.findById(withdrawalRequestId, queryRunner);
    });
  }

  /** FailWithdrawal: approved | processing → failed */
  async failWithdrawal(
    withdrawalRequestId: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const wr = await this.withdrawalRequestRepo.findById(withdrawalRequestId, queryRunner);

      if (!wr) throw new NotFoundException('WITHDRAWAL_REQUEST_NOT_FOUND');
      if (wr.status !== 'approved' && wr.status !== 'processing')
        throw new ConflictException('WITHDRAWAL_REQUEST_NOT_PROCESSABLE');

      await this.withdrawalRequestRepo.update(withdrawalRequestId, { status: 'failed' }, queryRunner);

      await this.outboxService.enqueue(
        {
          event_name: 'WITHDRAWAL_FAILED',
          event_version: 1,
          aggregate_type: 'WITHDRAWAL_REQUEST',
          aggregate_id: String(withdrawalRequestId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            wallet_id: wr.wallet_id,
            amount: wr.amount,
          },
        },
        queryRunner,
      );

      return this.withdrawalRequestRepo.findById(withdrawalRequestId, queryRunner);
    });
  }

  // ── WALLET HOLD ────────────────────────────────────────────────────────────

  /** PlaceHold: idempotent via UNIQUE(idempotency_key) */
  async placeHold(
    dto: WalletHoldCreateDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const insertedId = await this.holdRepo.insert(
        {
          wallet_id: dto.wallet_id,
          reason_code: dto.reason_code,
          amount: dto.amount,
          currency: dto.currency ?? 'MYR',
          status: 'active',
          ref_type: dto.ref_type ?? null,
          ref_id: dto.ref_id ?? null,
          idempotency_key: dto.idempotency_key ?? idempotencyKey,
          request_id: dto.request_id ?? null,
          expires_at: dto.expires_at ? new Date(dto.expires_at) : null,
        },
        queryRunner,
      );

      let result;
      if (!insertedId) {
        result = await this.holdRepo.findByIdempotencyKey(
          dto.idempotency_key ?? idempotencyKey,
          queryRunner,
        );
      } else {
        result = await this.holdRepo.findById(insertedId, queryRunner);
      }

      await this.outboxService.enqueue(
        {
          event_name: 'WALLET_HOLD_PLACED',
          event_version: 1,
          aggregate_type: 'WALLET_HOLD',
          aggregate_id: String(result!.id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            wallet_id: result!.wallet_id,
            reason_code: result!.reason_code,
            amount: result!.amount,
          },
        },
        queryRunner,
      );

      return result;
    });
  }

  /** ReleaseHold: active → released */
  async releaseHold(
    holdId: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const hold = await this.holdRepo.findById(holdId, queryRunner);

      if (!hold) throw new NotFoundException('WALLET_HOLD_NOT_FOUND');
      if (hold.status !== 'active')
        throw new ConflictException('WALLET_HOLD_NOT_ACTIVE');

      await this.holdRepo.update(holdId, { status: 'released', released_at: new Date() }, queryRunner);

      await this.outboxService.enqueue(
        {
          event_name: 'WALLET_HOLD_RELEASED',
          event_version: 1,
          aggregate_type: 'WALLET_HOLD',
          aggregate_id: String(holdId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            wallet_id: hold.wallet_id,
            amount: hold.amount,
            reason_code: hold.reason_code,
          },
        },
        queryRunner,
      );

      return this.holdRepo.findById(holdId, queryRunner);
    });
  }

  /** CaptureHold: active → captured */
  async captureHold(
    holdId: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const hold = await this.holdRepo.findById(holdId, queryRunner);

      if (!hold) throw new NotFoundException('WALLET_HOLD_NOT_FOUND');
      if (hold.status !== 'active')
        throw new ConflictException('WALLET_HOLD_NOT_ACTIVE');

      await this.holdRepo.update(holdId, { status: 'captured', captured_at: new Date() }, queryRunner);

      await this.outboxService.enqueue(
        {
          event_name: 'WALLET_HOLD_CAPTURED',
          event_version: 1,
          aggregate_type: 'WALLET_HOLD',
          aggregate_id: String(holdId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            wallet_id: hold.wallet_id,
            amount: hold.amount,
            reason_code: hold.reason_code,
          },
        },
        queryRunner,
      );

      return this.holdRepo.findById(holdId, queryRunner);
    });
  }

  /** ExpireHold: active → expired */
  async expireHold(
    holdId: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const hold = await this.holdRepo.findById(holdId, queryRunner);

      if (!hold) throw new NotFoundException('WALLET_HOLD_NOT_FOUND');
      if (hold.status !== 'active')
        throw new ConflictException('WALLET_HOLD_NOT_ACTIVE');

      await this.holdRepo.update(holdId, { status: 'expired' }, queryRunner);

      await this.outboxService.enqueue(
        {
          event_name: 'WALLET_HOLD_EXPIRED',
          event_version: 1,
          aggregate_type: 'WALLET_HOLD',
          aggregate_id: String(holdId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            wallet_id: hold.wallet_id,
            amount: hold.amount,
            reason_code: hold.reason_code,
          },
        },
        queryRunner,
      );

      return this.holdRepo.findById(holdId, queryRunner);
    });
  }

  // ── WALLET BATCH ───────────────────────────────────────────────────────────

  /** CreateBatch: idempotent via UNIQUE(idempotency_key) */
  async createBatch(
    dto: WalletBatchCreateDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const insertedId = await this.batchRepo.insert(
        {
          batch_type: dto.batch_type,
          status: 'created',
          ref_type: dto.ref_type ?? null,
          ref_id: dto.ref_id ?? null,
          idempotency_key: dto.idempotency_key ?? idempotencyKey,
          total_items: 0,
          success_items: 0,
          failed_items: 0,
          attempts: 0,
          meta_json: dto.meta_json ?? null,
        },
        queryRunner,
      );

      let result;
      if (!insertedId) {
        result = await this.batchRepo.findByIdempotencyKey(
          dto.idempotency_key ?? idempotencyKey,
          queryRunner,
        );
      } else {
        result = await this.batchRepo.findById(insertedId, queryRunner);
      }

      await this.outboxService.enqueue(
        {
          event_name: 'WALLET_BATCH_CREATED',
          event_version: 1,
          aggregate_type: 'WALLET_BATCH',
          aggregate_id: String(result!.id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            batch_type: result!.batch_type,
          },
        },
        queryRunner,
      );

      return result;
    });
  }

  /** AddBatchItem: idempotent via UNIQUE(idempotency_key) — no outbox emit */
  async addBatchItem(
    batchId: number,
    dto: WalletBatchItemAddDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const batch = await this.batchRepo.findById(batchId, queryRunner);

      if (!batch) throw new NotFoundException('WALLET_BATCH_NOT_FOUND');
      if (batch.status !== 'created')
        throw new ConflictException('WALLET_BATCH_NOT_OPEN');

      const insertedId = await this.batchItemRepo.insert(
        {
          batch_id: batchId,
          wallet_id: dto.wallet_id,
          account_id: dto.account_id,
          item_type: dto.item_type,
          amount: dto.amount,
          currency: dto.currency ?? 'MYR',
          status: 'created',
          ref_type: dto.ref_type ?? null,
          ref_id: dto.ref_id ?? null,
          idempotency_key: dto.idempotency_key ?? idempotencyKey,
          meta_json: dto.meta_json ?? null,
        },
        queryRunner,
      );

      let item;
      if (!insertedId) {
        item = await this.batchItemRepo.findByIdempotencyKey(
          dto.idempotency_key ?? idempotencyKey,
          queryRunner,
        );
      } else {
        item = await this.batchItemRepo.findById(insertedId, queryRunner);
        await this.batchRepo.update(
          batchId,
          { total_items: batch.total_items + 1 },
          queryRunner,
        );
      }

      return item;
    });
  }

  /** ProcessBatch: created | partial → processing */
  async processBatch(
    batchId: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const batch = await this.batchRepo.findById(batchId, queryRunner);

      if (!batch) throw new NotFoundException('WALLET_BATCH_NOT_FOUND');
      if (batch.status !== 'created' && batch.status !== 'partial')
        throw new ConflictException('WALLET_BATCH_NOT_PROCESSABLE');

      await this.batchRepo.update(
        batchId,
        { status: 'processing', started_at: new Date(), attempts: batch.attempts + 1 },
        queryRunner,
      );

      await this.outboxService.enqueue(
        {
          event_name: 'WALLET_BATCH_PROCESSING',
          event_version: 1,
          aggregate_type: 'WALLET_BATCH',
          aggregate_id: String(batchId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            batch_type: batch.batch_type,
            total_items: batch.total_items,
          },
        },
        queryRunner,
      );

      return this.batchRepo.findById(batchId, queryRunner);
    });
  }

  /** CompleteBatchItem: created | processing → completed, increments batch success counter */
  async completeBatchItem(
    batchId: number,
    batchItemId: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const item = await this.batchItemRepo.findByIdAndBatchId(batchItemId, batchId, queryRunner);

      if (!item) throw new NotFoundException('WALLET_BATCH_ITEM_NOT_FOUND');
      if (item.status !== 'created' && item.status !== 'processing')
        throw new ConflictException('WALLET_BATCH_ITEM_NOT_PROCESSABLE');

      const batch = await this.batchRepo.findById(batchId, queryRunner);

      await this.batchItemRepo.update(batchItemId, { status: 'completed' }, queryRunner);
      await this.batchRepo.update(
        batchId,
        { success_items: (batch?.success_items ?? 0) + 1 },
        queryRunner,
      );

      return this.batchItemRepo.findById(batchItemId, queryRunner);
    });
  }

  /** FailBatchItem: created | processing → failed, increments batch failed counter */
  async failBatchItem(
    batchId: number,
    batchItemId: number,
    dto: BatchItemFailDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const item = await this.batchItemRepo.findByIdAndBatchId(batchItemId, batchId, queryRunner);

      if (!item) throw new NotFoundException('WALLET_BATCH_ITEM_NOT_FOUND');
      if (item.status !== 'created' && item.status !== 'processing')
        throw new ConflictException('WALLET_BATCH_ITEM_NOT_PROCESSABLE');

      const batch = await this.batchRepo.findById(batchId, queryRunner);

      await this.batchItemRepo.update(
        batchItemId,
        { status: 'failed', failure_code: dto.failure_code },
        queryRunner,
      );
      await this.batchRepo.update(
        batchId,
        { failed_items: (batch?.failed_items ?? 0) + 1 },
        queryRunner,
      );

      return this.batchItemRepo.findById(batchItemId, queryRunner);
    });
  }

  /** FinalizeBatch: processing → completed | partial | failed */
  async finalizeBatch(
    batchId: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const batch = await this.batchRepo.findById(batchId, queryRunner);

      if (!batch) throw new NotFoundException('WALLET_BATCH_NOT_FOUND');
      if (batch.status !== 'processing')
        throw new ConflictException('WALLET_BATCH_NOT_PROCESSING');

      let finalStatus: string;
      if (batch.failed_items === 0) {
        finalStatus = 'completed';
      } else if (batch.failed_items > 0 && batch.failed_items < batch.total_items) {
        finalStatus = 'partial';
      } else {
        finalStatus = 'failed';
      }

      await this.batchRepo.update(
        batchId,
        { status: finalStatus, completed_at: new Date() },
        queryRunner,
      );

      await this.outboxService.enqueue(
        {
          event_name: 'WALLET_BATCH_FINALIZED',
          event_version: 1,
          aggregate_type: 'WALLET_BATCH',
          aggregate_id: String(batchId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            batch_type: batch.batch_type,
            status: finalStatus,
            total_items: batch.total_items,
            success_items: batch.success_items,
            failed_items: batch.failed_items,
          },
        },
        queryRunner,
      );

      return this.batchRepo.findById(batchId, queryRunner);
    });
  }

  // ── RULE SET ───────────────────────────────────────────────────────────────

  /** CreateRuleSet: no outbox emit */
  async createRuleSet(
    dto: RuleSetCreateDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const insertedId = await this.ruleSetRepo.insert(
        {
          wallet_id: dto.wallet_id,
          status: 'active',
          version: dto.version ?? 'v1',
          effective_from: dto.effective_from ? new Date(dto.effective_from) : null,
          effective_to: dto.effective_to ? new Date(dto.effective_to) : null,
          meta_json: dto.meta_json ?? null,
        },
        queryRunner,
      );

      return this.ruleSetRepo.findById(insertedId, queryRunner);
    });
  }

  /** AddRule: upsert via UNIQUE(rule_set_id, rule_code) — no outbox emit */
  async addRule(
    ruleSetId: number,
    dto: RuleAddDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const ruleSet = await this.ruleSetRepo.findById(ruleSetId, queryRunner);

      if (!ruleSet) throw new NotFoundException('WALLET_RULE_SET_NOT_FOUND');

      const insertedId = await this.ruleRepo.upsert(
        {
          rule_set_id: ruleSetId,
          rule_code: dto.rule_code,
          operator: dto.operator ?? 'eq',
          value_str: dto.value_str ?? null,
          value_num: dto.value_num !== undefined ? String(dto.value_num) : null,
          value_json: dto.value_json ?? null,
          status: 'active',
        },
        queryRunner,
      );

      return this.ruleRepo.findById(insertedId, queryRunner);
    });
  }

  /** DeactivateRuleSet: active → inactive — no outbox emit */
  async deactivateRuleSet(
    ruleSetId: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const ruleSet = await this.ruleSetRepo.findById(ruleSetId, queryRunner);

      if (!ruleSet) throw new NotFoundException('WALLET_RULE_SET_NOT_FOUND');
      if (ruleSet.status !== 'active')
        throw new ConflictException('WALLET_RULE_SET_NOT_ACTIVE');

      await this.ruleSetRepo.update(ruleSetId, { status: 'inactive' }, queryRunner);

      return this.ruleSetRepo.findById(ruleSetId, queryRunner);
    });
  }

  // ── THRESHOLD RULES & EVENTS ───────────────────────────────────────────────

  /** UpsertThresholdRule: upsert via UNIQUE(wallet_id, threshold_code) — no outbox emit */
  async upsertThresholdRule(
    dto: ThresholdRuleUpsertDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const insertedId = await this.thresholdRuleRepo.upsert(
        {
          wallet_id: dto.wallet_id,
          threshold_code: dto.threshold_code,
          threshold_amount: dto.threshold_amount,
          currency: dto.currency ?? 'MYR',
          status: 'active',
          meta_json: dto.meta_json ?? null,
        },
        queryRunner,
      );

      return this.thresholdRuleRepo.findById(insertedId, queryRunner);
    });
  }

  /** RecordThresholdBreach: idempotent via UNIQUE(idempotency_key) */
  async recordThresholdBreach(
    dto: ThresholdEventRecordDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const insertedId = await this.thresholdEventRepo.insert(
        {
          wallet_id: dto.wallet_id,
          threshold_code: dto.threshold_code,
          current_balance: dto.current_balance,
          threshold_amount: dto.threshold_amount,
          currency: dto.currency ?? 'MYR',
          status: 'breached',
          idempotency_key: dto.idempotency_key ?? idempotencyKey,
          payload_json: dto.payload_json ?? null,
          occurred_at: new Date(),
        },
        queryRunner,
      );

      let result;
      if (!insertedId) {
        result = await this.thresholdEventRepo.findByIdempotencyKey(
          dto.idempotency_key ?? idempotencyKey,
          queryRunner,
        );
      } else {
        result = await this.thresholdEventRepo.findById(insertedId, queryRunner);
      }

      await this.outboxService.enqueue(
        {
          event_name: 'WALLET_THRESHOLD_BREACHED',
          event_version: 1,
          aggregate_type: 'WALLET_THRESHOLD_EVENT',
          aggregate_id: String(result!.id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            wallet_id: result!.wallet_id,
            threshold_code: result!.threshold_code,
            current_balance: result!.current_balance,
            threshold_amount: result!.threshold_amount,
          },
        },
        queryRunner,
      );

      return result;
    });
  }

  // ── POLICY GATE ────────────────────────────────────────────────────────────

  /** UpsertPolicyGate: upsert via UNIQUE(wallet_id, gate_code) */
  async upsertPolicyGate(
    dto: PolicyGateUpsertDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    return this.txService.run(async (queryRunner) => {
      const insertedId = await this.policyGateRepo.upsert(
        {
          wallet_id: dto.wallet_id,
          gate_code: dto.gate_code,
          status: dto.status,
          meta_json: dto.meta_json ?? null,
        },
        queryRunner,
      );

      const result = await this.policyGateRepo.findById(insertedId, queryRunner);

      await this.outboxService.enqueue(
        {
          event_name: 'WALLET_POLICY_GATE_UPDATED',
          event_version: 1,
          aggregate_type: 'WALLET_POLICY_GATE',
          aggregate_id: String(result!.id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            wallet_id: result!.wallet_id,
            gate_code: result!.gate_code,
            status: result!.status,
          },
        },
        queryRunner,
      );

      return result;
    });
  }
}

/**
 * H6: Maps a purpose_code to the gate_code that must be 'on' for it to proceed.
 * Returns null if the purpose_code is 'annual_fee' (always allowed).
 */
function purposeGateCode(purposeCode: string): string | null {
  const map: Record<string, string> = {
    withdrawal: 'allow_withdrawal',
    transfer:   'allow_transfer',
  };
  if (purposeCode === 'annual_fee') return null; // always allowed
  return map[purposeCode] ?? `allow_${purposeCode}`;
}
