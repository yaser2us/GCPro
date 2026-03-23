import { Injectable, Logger } from '@nestjs/common';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { OutboxService } from '../../../corekit/services/outbox.service';

/**
 * PolicyActivatedHandler — Phase 6 (Referral plugin)
 *
 * On POLICY_ACTIVATED: resolves the policy holder user_id, finds their referral
 * conversion (if they were referred), then requests reward grants for both
 * referrer and referee via referral_rule configuration.
 *
 * Algorithm:
 * 1. Resolve policy holder user_id via policy_member → person
 * 2. Find referral_conversion WHERE referred_user_id = user_id
 * 3. Skip if no conversion found (user was not referred)
 * 4. Skip if reward grants already exist (idempotency)
 * 5. Load referral_rule for program (referrer_reward_coins, referee_reward_coins)
 * 6. Upsert referral_reward_grant rows for each rule (status='requested')
 * 7. Emit REFERRAL_REWARD_REQUESTED per grant
 *
 * Cross-plugin reads: policy_member, person (raw SQL — no TypeORM cross-module dependency)
 */
@Injectable()
export class PolicyActivatedHandler {
  private readonly logger = new Logger(PolicyActivatedHandler.name);

  constructor(
    private readonly txService: TransactionService,
    private readonly outboxService: OutboxService,
  ) {}

  async handle(event: { policy_id: number | string }): Promise<void> {
    const policyId = Number(event.policy_id);

    await this.txService.run(async (queryRunner) => {
      // 1. Resolve holder user_id via policy_member → person
      const holderRows = await queryRunner.manager.query(
        `SELECT p.primary_user_id AS user_id
         FROM policy_member pm
         JOIN person p ON p.id = pm.person_id
         WHERE pm.policy_id = ? AND pm.role = 'holder' AND pm.status = 'active'
         LIMIT 1`,
        [policyId],
      );

      if (!holderRows?.length || !holderRows[0].user_id) {
        this.logger.warn(`[P6] No holder user found for policy_id=${policyId}, skipping`);
        return;
      }

      const userId = Number(holderRows[0].user_id);

      // 2. Find referral_conversion for this user
      const conversionRows = await queryRunner.manager.query(
        `SELECT rc.id, rc.program_id, rc.invite_id, rc.referred_user_id
         FROM referral_conversion rc
         WHERE rc.referred_user_id = ? AND rc.status = 'converted'
         LIMIT 1`,
        [userId],
      );

      if (!conversionRows?.length) {
        this.logger.log(`[P6] No referral conversion for user_id=${userId}, policy_id=${policyId} — skipping`);
        return;
      }

      const conversion = conversionRows[0];
      const conversionId = Number(conversion.id);
      const programId = Number(conversion.program_id);
      const inviteId = Number(conversion.invite_id);

      // 3. Idempotency: skip if grants already exist
      const existingGrants = await queryRunner.manager.query(
        `SELECT id FROM referral_reward_grant WHERE conversion_id = ? LIMIT 1`,
        [conversionId],
      );

      if (existingGrants?.length) {
        this.logger.log(`[P6] Reward grants already exist for conversion_id=${conversionId}, skipping`);
        return;
      }

      // 4. Load invite to get referrer_user_id
      const inviteRows = await queryRunner.manager.query(
        `SELECT referrer_user_id FROM referral_invite WHERE id = ? LIMIT 1`,
        [inviteId],
      );

      if (!inviteRows?.length) {
        this.logger.warn(`[P6] Invite not found for invite_id=${inviteId}, conversion_id=${conversionId}`);
        return;
      }

      const referrerUserId = Number(inviteRows[0].referrer_user_id);
      const referredUserId = Number(conversion.referred_user_id);

      // 5. Load active reward rules for this program
      const ruleRows: Array<{
        rule_code: string;
        value_num: string | null;
      }> = await queryRunner.manager.query(
        `SELECT rule_code, value_num
         FROM referral_rule
         WHERE program_id = ?
           AND rule_code IN ('referrer_reward_coins', 'referee_reward_coins')
           AND status = 'active'`,
        [programId],
      );

      if (!ruleRows?.length) {
        this.logger.log(`[P6] No active reward rules for program_id=${programId}, conversion_id=${conversionId}`);
        return;
      }

      // 6. Build reward specs from rules
      const rewardSpecs: Array<{
        beneficiary_user_id: number;
        beneficiary_role: string;
        amount: number;
      }> = [];

      for (const rule of ruleRows) {
        const amount = rule.value_num ? Number(rule.value_num) : 0;
        if (amount <= 0) continue;

        if (rule.rule_code === 'referrer_reward_coins') {
          rewardSpecs.push({
            beneficiary_user_id: referrerUserId,
            beneficiary_role: 'referrer',
            amount,
          });
        } else if (rule.rule_code === 'referee_reward_coins') {
          rewardSpecs.push({
            beneficiary_user_id: referredUserId,
            beneficiary_role: 'referee',
            amount,
          });
        }
      }

      if (!rewardSpecs.length) {
        this.logger.log(`[P6] No reward specs generated for conversion_id=${conversionId}`);
        return;
      }

      // 7. Upsert reward grants and emit REFERRAL_REWARD_REQUESTED per grant
      for (const spec of rewardSpecs) {
        const idempotencyKey = `ref_reward:${conversionId}:${spec.beneficiary_role}`;

        await queryRunner.manager.query(
          `INSERT INTO referral_reward_grant
             (program_id, conversion_id, beneficiary_user_id, beneficiary_role,
              reward_type, amount, currency, status, idempotency_key, granted_at, created_at)
           VALUES (?, ?, ?, ?, 'coins', ?, 'COIN', 'requested', ?, NOW(), NOW())
           ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
          [programId, conversionId, spec.beneficiary_user_id, spec.beneficiary_role, spec.amount, idempotencyKey],
        );

        const [grantRow] = await queryRunner.manager.query(
          `SELECT id FROM referral_reward_grant WHERE idempotency_key = ? LIMIT 1`,
          [idempotencyKey],
        );

        const grantId = grantRow?.id ? Number(grantRow.id) : null;

        await this.outboxService.enqueue(
          {
            event_name: 'REFERRAL_REWARD_REQUESTED',
            event_version: 1,
            aggregate_type: 'REFERRAL_REWARD_GRANT',
            aggregate_id: String(grantId ?? conversionId),
            actor_user_id: String(userId),
            occurred_at: new Date(),
            correlation_id: idempotencyKey,
            causation_id: `policy_activated_${policyId}`,
            payload: {
              grant_id: grantId,
              conversion_id: conversionId,
              program_id: programId,
              beneficiary_user_id: spec.beneficiary_user_id,
              beneficiary_role: spec.beneficiary_role,
              reward_type: 'coins',
              amount: spec.amount,
              currency: 'COIN',
              policy_id: policyId,
            },
            dedupe_key: `${idempotencyKey}:emit`,
          },
          queryRunner,
        );

        this.logger.log(
          `[P6] Reward grant created: conversion_id=${conversionId}, role=${spec.beneficiary_role}, user_id=${spec.beneficiary_user_id}, amount=${spec.amount} COIN, grant_id=${grantId}`,
        );
      }

      this.logger.log(
        `[P6] Policy activated referral rewards: policy_id=${policyId}, user_id=${userId}, conversion_id=${conversionId}, grants=${rewardSpecs.length}`,
      );
    });
  }
}
