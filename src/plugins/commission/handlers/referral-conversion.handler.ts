import { Injectable, Logger } from '@nestjs/common';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { OutboxService } from '../../../corekit/services/outbox.service';
import { CommissionAccrualRepository } from '../repositories/commission-accrual.repo';

/**
 * ReferralConversionHandler — Phase 7A (Commission plugin)
 *
 * On REFERRAL_CONVERSION_CREATED: walks the referral_chain to find all ancestors
 * of the referred user, resolves their commission_participant records, matches the
 * depth-level commission_rule (code = 'level_<depth>'), and upserts
 * commission_accrual rows. Emits ACCRUAL_RECORDED per accrual.
 *
 * Commission rule code convention:
 *   depth=1 → rule code 'level_1'
 *   depth=2 → rule code 'level_2'
 *   depth=3 → rule code 'level_3'
 *
 * Rule types supported:
 *   fixed  → accrual amount = rule.amount_fixed
 *   percent → skipped (no conversion_value on referral events)
 *
 * Cross-plugin reads:
 *   referral_chain — raw SQL (no TypeORM cross-module dependency)
 *   commission_participant / commission_rule — owned tables, via raw SQL in txn
 *
 * Source: specs/commission/commission.pillar.v2.yml integration.referral_pillar
 */
@Injectable()
export class ReferralConversionHandler {
  private readonly logger = new Logger(ReferralConversionHandler.name);

  constructor(
    private readonly txService: TransactionService,
    private readonly outboxService: OutboxService,
    private readonly accrualRepo: CommissionAccrualRepository,
  ) {}

  async handle(event: {
    conversion_id: number;
    program_id: number;
    invite_id: number;
    referrer_user_id: number;
    referred_user_id: number;
    [key: string]: any;
  }): Promise<void> {
    const { conversion_id, referred_user_id } = event;

    await this.txService.run(async (queryRunner) => {
      // 1. Fetch all ancestors of the referred user from referral_chain
      const ancestorRows: Array<{
        ancestor_user_id: number;
        depth: number;
        program_id: number;
      }> = await queryRunner.manager.query(
        `SELECT ancestor_user_id, depth, program_id
         FROM referral_chain
         WHERE descendant_user_id = ?
         ORDER BY depth ASC`,
        [referred_user_id],
      );

      if (!ancestorRows?.length) {
        this.logger.log(
          `[7A] No referral chain ancestors for referred_user_id=${referred_user_id}, conversion_id=${conversion_id}`,
        );
        return;
      }

      let accrualCount = 0;

      for (const ancestor of ancestorRows) {
        const { ancestor_user_id: ancestorUserId, depth } = ancestor;

        // 2. Find active commission_participant for this ancestor user
        const participantRows = await queryRunner.manager.query(
          `SELECT id, program_id, wallet_id, status
           FROM commission_participant
           WHERE participant_type = 'user'
             AND participant_id = ?
             AND status = 'active'
           LIMIT 1`,
          [ancestorUserId],
        );

        if (!participantRows?.length) {
          this.logger.log(
            `[7A] No active commission_participant for ancestor_user_id=${ancestorUserId} depth=${depth}, skipping`,
          );
          continue;
        }

        const participant = participantRows[0];
        const participantId = Number(participant.id);
        const commissionProgramId = Number(participant.program_id);

        // 3. Find active commission_rule for this depth level
        const ruleCode = `level_${depth}`;
        const ruleRows = await queryRunner.manager.query(
          `SELECT id, rule_type, amount_fixed, rate_pct
           FROM commission_rule
           WHERE program_id = ?
             AND code = ?
             AND status = 'active'
           LIMIT 1`,
          [commissionProgramId, ruleCode],
        );

        if (!ruleRows?.length) {
          this.logger.log(
            `[7A] No active commission_rule code='${ruleCode}' for program_id=${commissionProgramId}, skipping`,
          );
          continue;
        }

        const rule = ruleRows[0];
        let amount = 0;

        if (rule.rule_type === 'fixed' && rule.amount_fixed) {
          amount = Number(rule.amount_fixed);
        } else if (rule.rule_type === 'percent') {
          // No base conversion_value for referral events — percent rules yield 0
          this.logger.log(
            `[7A] Skipping percent rule for referral conversion — no conversion_value available`,
          );
          continue;
        }

        if (amount <= 0) continue;

        // 4. Upsert commission_accrual (idempotent via idempotency_key)
        const idempotencyKey = `referral_conv_${conversion_id}_depth_${depth}`;
        const accrualId = await this.accrualRepo.upsert(
          {
            program_id: commissionProgramId,
            participant_id: participantId,
            rule_id: Number(rule.id),
            accrual_type: 'referral_conversion',
            currency: 'COIN',
            amount,
            source_ref_type: 'referral_conversion',
            source_ref_id: String(conversion_id),
            idempotency_key: idempotencyKey,
            status: 'accrued',
            occurred_at: new Date(),
          },
          queryRunner,
        );

        // 5. Emit ACCRUAL_RECORDED → wallet plugin will credit the participant's wallet
        await this.outboxService.enqueue(
          {
            event_name: 'ACCRUAL_RECORDED',
            event_version: 1,
            aggregate_type: 'PROGRAM',
            aggregate_id: String(commissionProgramId),
            actor_user_id: String(ancestorUserId),
            occurred_at: new Date(),
            correlation_id: idempotencyKey,
            causation_id: `referral_conversion_${conversion_id}`,
            payload: {
              accrual_id: accrualId,
              program_id: commissionProgramId,
              participant_id: participantId,
              amount,
              currency: 'COIN',
              source_ref_type: 'referral_conversion',
              source_ref_id: String(conversion_id),
              depth,
              ancestor_user_id: ancestorUserId,
            },
            dedupe_key: `accrual_recorded_${idempotencyKey}`,
          },
          queryRunner,
        );

        accrualCount++;
        this.logger.log(
          `[7A] Accrual created: conversion_id=${conversion_id}, depth=${depth}, ancestor_user_id=${ancestorUserId}, amount=${amount} COIN, accrual_id=${accrualId}`,
        );
      }

      this.logger.log(
        `[7A] ReferralConversion processed: conversion_id=${conversion_id}, referred_user_id=${referred_user_id}, accruals_created=${accrualCount}`,
      );
    });
  }
}
