import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { OutboxService } from '../../../corekit/services/outbox.service';
import { CrowdPeriodRepository } from '../repositories/crowd-period.repo';
import { CrowdPackageBucketRepository } from '../repositories/crowd-package-bucket.repo';
import { CrowdPeriodMemberRepository } from '../repositories/crowd-period-member.repo';
import { CrowdPeriodClaimRepository } from '../repositories/crowd-period-claim.repo';
import { CrowdMemberChargeRepository } from '../repositories/crowd-member-charge.repo';
import { CrowdClaimPayoutRepository } from '../repositories/crowd-claim-payout.repo';
import { CrowdPeriodEventRepository } from '../repositories/crowd-period-event.repo';
import { CrowdPeriodRunRepository } from '../repositories/crowd-period-run.repo';
import { CrowdPeriodRunLockRepository } from '../repositories/crowd-period-run-lock.repo';
import { CrowdPeriodCreateDto } from '../dtos/crowd-period-create.dto';
import { CrowdMemberAddDto } from '../dtos/crowd-member-add.dto';
import { CrowdClaimAddDto } from '../dtos/crowd-claim-add.dto';
import { MemberChargeMarkChargedDto } from '../dtos/member-charge-mark-charged.dto';
import { ClaimPayoutMarkPaidDto } from '../dtos/claim-payout-mark-paid.dto';
import type { Actor } from '../../../corekit/types/actor.type';
import { v4 as uuidv4 } from 'uuid';

/**
 * CrowdWorkflowService
 * Implements crowd (Takaful) commands following the workflow discipline:
 * Guard → Write → Emit → Commit
 *
 * Based on specs/crowd/crowd.pillar.v2.yml
 */
@Injectable()
export class CrowdWorkflowService {
  constructor(
    private readonly txService: TransactionService,
    private readonly outboxService: OutboxService,
    private readonly crowdPeriodRepo: CrowdPeriodRepository,
    private readonly crowdPackageBucketRepo: CrowdPackageBucketRepository,
    private readonly crowdPeriodMemberRepo: CrowdPeriodMemberRepository,
    private readonly crowdPeriodClaimRepo: CrowdPeriodClaimRepository,
    private readonly crowdMemberChargeRepo: CrowdMemberChargeRepository,
    private readonly crowdClaimPayoutRepo: CrowdClaimPayoutRepository,
    private readonly crowdPeriodEventRepo: CrowdPeriodEventRepository,
    private readonly crowdPeriodRunRepo: CrowdPeriodRunRepository,
    private readonly crowdPeriodRunLockRepo: CrowdPeriodRunLockRepository,
  ) {}

  /**
   * CREATE PERIOD COMMAND
   * Source: specs/crowd/crowd.pillar.v2.yml
   * HTTP: POST /api/v1/crowd/periods
   */
  async createPeriod(dto: CrowdPeriodCreateDto, actor: Actor, idempotencyKey: string) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: check no existing crowd_period with same period_key
      const existing = await this.crowdPeriodRepo.findByPeriodKey(dto.periodKey, queryRunner);
      if (existing) {
        throw new ConflictException({
          code: 'PERIOD_KEY_ALREADY_EXISTS',
          message: `Crowd period with period_key '${dto.periodKey}' already exists`,
        });
      }

      // WRITE: Insert crowd_period
      const periodId = await this.crowdPeriodRepo.create(
        {
          uuid: uuidv4(),
          period_key: dto.periodKey,
          period_from: dto.periodFrom ? new Date(dto.periodFrom) : null,
          period_to: dto.periodTo ? new Date(dto.periodTo) : null,
          last_debt_amount: dto.lastDebtAmount || '0.00',
          last_extra_amount: dto.lastExtraAmount || '0.00',
          rule_version: dto.ruleVersion || null,
          meta: dto.meta || null,
          status: 'created',
        },
        queryRunner,
      );

      // WRITE: Insert crowd_period_event
      await this.crowdPeriodEventRepo.create(
        {
          crowd_period_id: periodId,
          event_type: 'PERIOD_CREATED',
          actor_type: 'admin',
          actor_id: Number(actor.actor_user_id) || null,
          payload: { period_key: dto.periodKey },
        },
        queryRunner,
      );

      // EMIT: CROWD_PERIOD_CREATED
      await this.outboxService.enqueue(
        {
          event_name: 'CROWD_PERIOD_CREATED',
          event_version: 1,
          aggregate_type: 'CROWD_PERIOD',
          aggregate_id: String(periodId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `create-crowd-period-${periodId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-create-crowd-period-${periodId}`,
          payload: {
            period_id: periodId,
            period_key: dto.periodKey,
            status: 'created',
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return { periodId, periodKey: dto.periodKey, status: 'created' };
    });

    return result;
  }

  /**
   * ADD MEMBER COMMAND
   * Source: specs/crowd/crowd.pillar.v2.yml
   * HTTP: POST /api/v1/crowd/periods/:periodId/members
   */
  async addMember(periodId: number, dto: CrowdMemberAddDto, actor: Actor, idempotencyKey: string) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: Read period, check exists + status='created'
      const period = await this.crowdPeriodRepo.findById(periodId, queryRunner);
      if (!period) {
        throw new NotFoundException({
          code: 'PERIOD_NOT_FOUND',
          message: `Crowd period with id ${periodId} not found`,
        });
      }
      if (period.status !== 'created') {
        throw new ConflictException({
          code: 'INVALID_PERIOD_STATUS',
          message: `Crowd period must be in 'created' status, currently '${period.status}'`,
        });
      }

      // GUARD: check uk_period_member not violated
      const existingMember = await queryRunner.manager.query(
        `SELECT id FROM crowd_period_member WHERE crowd_period_id = ? AND insurant_id = ? LIMIT 1`,
        [periodId, dto.insurantId],
      );
      if (existingMember.length > 0) {
        throw new ConflictException({
          code: 'MEMBER_ALREADY_EXISTS',
          message: `Insurant ${dto.insurantId} is already a member of period ${periodId}`,
        });
      }

      // WRITE: Insert crowd_period_member
      const memberId = await this.crowdPeriodMemberRepo.create(
        {
          crowd_period_id: periodId,
          insurant_id: dto.insurantId,
          package_id: dto.packageId,
          status: 'active',
          reason_code: dto.reasonCode || 'OK',
          note: dto.note || null,
          package_code_snapshot: dto.packageCodeSnapshot || null,
          age_years_snapshot: dto.ageYearsSnapshot || null,
          smoker_snapshot: dto.smokerSnapshot !== undefined ? (dto.smokerSnapshot ? 1 : 0) : null,
          meta: dto.meta || null,
        },
        queryRunner,
      );

      // WRITE: Update crowd_period total_member += 1
      await queryRunner.manager.query(
        `UPDATE crowd_period SET total_member = total_member + 1 WHERE id = ?`,
        [periodId],
      );

      // EMIT: CROWD_MEMBER_ADDED
      await this.outboxService.enqueue(
        {
          event_name: 'CROWD_MEMBER_ADDED',
          event_version: 1,
          aggregate_type: 'CROWD_PERIOD',
          aggregate_id: String(periodId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `add-crowd-member-${memberId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-add-crowd-member-${memberId}`,
          payload: {
            member_id: memberId,
            period_id: periodId,
            insurant_id: dto.insurantId,
            package_id: dto.packageId,
            status: 'active',
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return { memberId, insurantId: dto.insurantId, status: 'active' };
    });

    return result;
  }

  /**
   * ADD CLAIM COMMAND
   * Source: specs/crowd/crowd.pillar.v2.yml
   * HTTP: POST /api/v1/crowd/periods/:periodId/claims
   */
  async addClaim(periodId: number, dto: CrowdClaimAddDto, actor: Actor, idempotencyKey: string) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: Read period, check exists + status='created'
      const period = await this.crowdPeriodRepo.findById(periodId, queryRunner);
      if (!period) {
        throw new NotFoundException({
          code: 'PERIOD_NOT_FOUND',
          message: `Crowd period with id ${periodId} not found`,
        });
      }
      if (period.status !== 'created') {
        throw new ConflictException({
          code: 'INVALID_PERIOD_STATUS',
          message: `Crowd period must be in 'created' status, currently '${period.status}'`,
        });
      }

      // GUARD: check uk_period_claim not violated
      const existingClaim = await queryRunner.manager.query(
        `SELECT id FROM crowd_period_claim WHERE crowd_period_id = ? AND claim_id = ? LIMIT 1`,
        [periodId, dto.claimId],
      );
      if (existingClaim.length > 0) {
        throw new ConflictException({
          code: 'CLAIM_ALREADY_EXISTS',
          message: `Claim ${dto.claimId} is already included in period ${periodId}`,
        });
      }

      // WRITE: Insert crowd_period_claim
      const claimEntryId = await this.crowdPeriodClaimRepo.create(
        {
          crowd_period_id: periodId,
          claim_id: dto.claimId,
          period_key: period.period_key,
          approved_amount_snapshot: dto.approvedAmountSnapshot,
          eligibility_version: dto.eligibilityVersion || null,
          status: 'included',
          meta: dto.meta || null,
        },
        queryRunner,
      );

      // WRITE: Update crowd_period total_case += 1, case_required_amount += approvedAmountSnapshot
      await queryRunner.manager.query(
        `UPDATE crowd_period SET total_case = total_case + 1, case_required_amount = case_required_amount + ? WHERE id = ?`,
        [dto.approvedAmountSnapshot, periodId],
      );

      // EMIT: CROWD_CLAIM_ADDED
      await this.outboxService.enqueue(
        {
          event_name: 'CROWD_CLAIM_ADDED',
          event_version: 1,
          aggregate_type: 'CROWD_PERIOD',
          aggregate_id: String(periodId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `add-crowd-claim-${claimEntryId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-add-crowd-claim-${claimEntryId}`,
          payload: {
            claim_entry_id: claimEntryId,
            period_id: periodId,
            claim_id: dto.claimId,
            approved_amount_snapshot: dto.approvedAmountSnapshot,
            status: 'included',
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return { claimEntryId, claimId: dto.claimId, status: 'included' };
    });

    return result;
  }

  /**
   * CALCULATE PERIOD COMMAND
   * Source: specs/crowd/crowd.pillar.v2.yml
   * HTTP: POST /api/v1/crowd/periods/:periodId/calculate
   */
  async calculatePeriod(
    periodId: number,
    ruleVersion: string | undefined,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: Read period, check exists + status='created' + total_member > 0
      const period = await this.crowdPeriodRepo.findById(periodId, queryRunner);
      if (!period) {
        throw new NotFoundException({
          code: 'PERIOD_NOT_FOUND',
          message: `Crowd period with id ${periodId} not found`,
        });
      }
      if (period.status !== 'created') {
        throw new ConflictException({
          code: 'INVALID_PERIOD_STATUS',
          message: `Crowd period must be in 'created' status, currently '${period.status}'`,
        });
      }
      if (period.total_member <= 0) {
        throw new BadRequestException({
          code: 'NO_MEMBERS',
          message: `Crowd period must have at least one member before calculating`,
        });
      }

      const runId = uuidv4();
      const instanceId = `worker-${uuidv4()}`;

      // ACQUIRE LOCK: INSERT INTO crowd_period_run_lock ... ON DUPLICATE KEY UPDATE
      await queryRunner.manager.query(
        `INSERT INTO crowd_period_run_lock
          (crowd_period_id, lock_key, owner_instance_id, run_id, status, locked_at, heartbeat_at, lease_seconds)
         VALUES (?, ?, ?, ?, 'locked', NOW(), NOW(), 300)
         ON DUPLICATE KEY UPDATE
           owner_instance_id = VALUES(owner_instance_id),
           run_id = VALUES(run_id),
           status = 'locked',
           locked_at = NOW(),
           heartbeat_at = NOW()`,
        [periodId, 'calculation', instanceId, runId],
      );

      // WRITE: Insert crowd_period_run (status='running')
      const runDbId = await this.crowdPeriodRunRepo.create(
        {
          crowd_period_id: periodId,
          run_id: runId,
          triggered_by_actor_type: 'admin',
          triggered_by_actor_id: Number(actor.actor_user_id) || null,
          status: 'running',
        },
        queryRunner,
      );

      // WRITE: Update crowd_period status='calculating'
      await this.crowdPeriodRepo.update(periodId, { status: 'calculating' }, queryRunner);

      // WRITE: Insert crowd_period_event CALCULATION_STARTED
      await this.crowdPeriodEventRepo.create(
        {
          crowd_period_id: periodId,
          event_type: 'CALCULATION_STARTED',
          actor_type: 'admin',
          actor_id: Number(actor.actor_user_id) || null,
          payload: { run_id: runId },
        },
        queryRunner,
      );

      // EMIT: CROWD_PERIOD_CALCULATION_STARTED
      await this.outboxService.enqueue(
        {
          event_name: 'CROWD_PERIOD_CALCULATION_STARTED',
          event_version: 1,
          aggregate_type: 'CROWD_PERIOD',
          aggregate_id: String(periodId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `calc-crowd-period-${periodId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-calc-crowd-period-${periodId}`,
          payload: { period_id: periodId, run_id: runId },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      // READ: all crowd_period_members for this period
      const members = await this.crowdPeriodMemberRepo.findByPeriodId(periodId, queryRunner);

      // Re-read period for latest amounts
      const freshPeriod = await this.crowdPeriodRepo.findById(periodId, queryRunner);

      // Calculate total_required_amount = case_required_amount + last_debt_amount - last_extra_amount
      const caseRequired = parseFloat(freshPeriod!.case_required_amount || '0');
      const lastDebt = parseFloat(freshPeriod!.last_debt_amount || '0');
      const lastExtra = parseFloat(freshPeriod!.last_extra_amount || '0');
      const totalRequiredAmount = caseRequired + lastDebt - lastExtra;
      const totalMember = members.length;

      // Equal sharing per member regardless of package
      const sharingCostEach = totalMember > 0
        ? parseFloat((totalRequiredAmount / totalMember).toFixed(2))
        : 0;

      // Group members by package_id
      const packageMap: Record<number, typeof members> = {};
      for (const member of members) {
        const pkgId = member.package_id;
        if (!packageMap[pkgId]) {
          packageMap[pkgId] = [];
        }
        packageMap[pkgId].push(member);
      }

      // For each package: Insert crowd_package_bucket + crowd_member_charge per member
      for (const [packageIdStr, pkgMembers] of Object.entries(packageMap)) {
        const packageId = Number(packageIdStr);
        const memberCountInPkg = pkgMembers.length;
        const sharingCostTotal = parseFloat((sharingCostEach * memberCountInPkg).toFixed(2));

        // Insert crowd_package_bucket
        const bucketId = await this.crowdPackageBucketRepo.create(
          {
            crowd_period_id: periodId,
            package_id: packageId,
            weightage: '1.000',
            member_count: memberCountInPkg,
            sharing_cost_each: sharingCostEach.toFixed(2),
            sharing_cost_total: sharingCostTotal.toFixed(2),
          },
          queryRunner,
        );

        // For each member in package: Insert crowd_member_charge
        for (const member of pkgMembers) {
          await this.crowdMemberChargeRepo.create(
            {
              crowd_period_id: periodId,
              insurant_id: member.insurant_id,
              package_bucket_id: bucketId,
              charge_amount: sharingCostEach.toFixed(2),
              remaining_amount: sharingCostEach.toFixed(2),
              status: 'planned',
              idempotency_key: `${period.period_key}:${member.insurant_id}`,
              calc_version: ruleVersion || null,
            },
            queryRunner,
          );
        }
      }

      // READ: all crowd_period_claims for this period
      const claims = await this.crowdPeriodClaimRepo.findByPeriodId(periodId, queryRunner);

      // For each claim: Insert crowd_claim_payout
      for (const claim of claims) {
        await this.crowdClaimPayoutRepo.create(
          {
            crowd_period_id: periodId,
            crowd_period_claim_id: claim.id,
            amount: claim.approved_amount_snapshot,
            status: 'planned',
            idempotency_key: `${period.period_key}:claim:${claim.claim_id}`,
          },
          queryRunner,
        );
      }

      // WRITE: Update crowd_period status='calculated'
      await this.crowdPeriodRepo.update(
        periodId,
        {
          status: 'calculated',
          total_required_amount: totalRequiredAmount.toFixed(2),
          rule_version: ruleVersion || period.rule_version,
          calculated_at: new Date(),
        },
        queryRunner,
      );

      // WRITE: Update crowd_period_run status='completed'
      await this.crowdPeriodRunRepo.update(
        runDbId,
        { status: 'completed', ended_at: new Date() },
        queryRunner,
      );

      // WRITE: Update crowd_period_run_lock status='released'
      await queryRunner.manager.query(
        `UPDATE crowd_period_run_lock SET status = 'released', released_at = NOW() WHERE crowd_period_id = ? AND lock_key = ?`,
        [periodId, 'calculation'],
      );

      // EMIT: CROWD_PERIOD_CALCULATED
      await this.outboxService.enqueue(
        {
          event_name: 'CROWD_PERIOD_CALCULATED',
          event_version: 1,
          aggregate_type: 'CROWD_PERIOD',
          aggregate_id: String(periodId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `calculated-crowd-period-${periodId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-calculated-crowd-period-${periodId}`,
          payload: {
            period_id: periodId,
            status: 'calculated',
            total_member: totalMember,
            total_case: claims.length,
            total_required_amount: totalRequiredAmount.toFixed(2),
          },
          dedupe_key: `${idempotencyKey}:calculated`,
        },
        queryRunner,
      );

      return {
        periodId,
        status: 'calculated',
        totalMember,
        totalCase: claims.length,
        totalRequiredAmount: totalRequiredAmount.toFixed(2),
      };
    });

    return result;
  }

  /**
   * COMPLETE PERIOD COMMAND
   * Source: specs/crowd/crowd.pillar.v2.yml
   * HTTP: POST /api/v1/crowd/periods/:periodId/complete
   */
  async completePeriod(periodId: number, actor: Actor, idempotencyKey: string) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: Read period, check exists + status='calculated'
      const period = await this.crowdPeriodRepo.findById(periodId, queryRunner);
      if (!period) {
        throw new NotFoundException({
          code: 'PERIOD_NOT_FOUND',
          message: `Crowd period with id ${periodId} not found`,
        });
      }
      if (period.status !== 'calculated') {
        throw new ConflictException({
          code: 'INVALID_PERIOD_STATUS',
          message: `Crowd period must be in 'calculated' status, currently '${period.status}'`,
        });
      }

      const completedAt = new Date();

      // WRITE: Update crowd_period status='completed'
      await this.crowdPeriodRepo.update(periodId, { status: 'completed', completed_at: completedAt }, queryRunner);

      // WRITE: Insert crowd_period_event PERIOD_COMPLETED
      await this.crowdPeriodEventRepo.create(
        {
          crowd_period_id: periodId,
          event_type: 'PERIOD_COMPLETED',
          actor_type: 'admin',
          actor_id: Number(actor.actor_user_id) || null,
        },
        queryRunner,
      );

      // EMIT: CROWD_PERIOD_COMPLETED
      await this.outboxService.enqueue(
        {
          event_name: 'CROWD_PERIOD_COMPLETED',
          event_version: 1,
          aggregate_type: 'CROWD_PERIOD',
          aggregate_id: String(periodId),
          actor_user_id: actor.actor_user_id,
          occurred_at: completedAt,
          correlation_id: actor.correlation_id || `complete-crowd-period-${periodId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-complete-crowd-period-${periodId}`,
          payload: { period_id: periodId, status: 'completed', completed_at: completedAt },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return { periodId, status: 'completed', completedAt };
    });

    return result;
  }

  /**
   * CANCEL PERIOD COMMAND
   * Source: specs/crowd/crowd.pillar.v2.yml
   * HTTP: POST /api/v1/crowd/periods/:periodId/cancel
   */
  async cancelPeriod(periodId: number, actor: Actor, idempotencyKey: string) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: Read period, check exists + status in ['created','calculated']
      const period = await this.crowdPeriodRepo.findById(periodId, queryRunner);
      if (!period) {
        throw new NotFoundException({
          code: 'PERIOD_NOT_FOUND',
          message: `Crowd period with id ${periodId} not found`,
        });
      }
      if (!['created', 'calculated'].includes(period.status)) {
        throw new ConflictException({
          code: 'INVALID_PERIOD_STATUS',
          message: `Crowd period must be in 'created' or 'calculated' status, currently '${period.status}'`,
        });
      }

      // WRITE: Update crowd_period status='cancelled'
      await this.crowdPeriodRepo.update(periodId, { status: 'cancelled' }, queryRunner);

      // WRITE: Insert crowd_period_event PERIOD_CANCELLED
      await this.crowdPeriodEventRepo.create(
        {
          crowd_period_id: periodId,
          event_type: 'PERIOD_CANCELLED',
          actor_type: 'admin',
          actor_id: Number(actor.actor_user_id) || null,
        },
        queryRunner,
      );

      // EMIT: CROWD_PERIOD_CANCELLED
      await this.outboxService.enqueue(
        {
          event_name: 'CROWD_PERIOD_CANCELLED',
          event_version: 1,
          aggregate_type: 'CROWD_PERIOD',
          aggregate_id: String(periodId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `cancel-crowd-period-${periodId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-cancel-crowd-period-${periodId}`,
          payload: { period_id: periodId, status: 'cancelled' },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return { periodId, status: 'cancelled' };
    });

    return result;
  }

  /**
   * MARK MEMBER CHARGED COMMAND
   * Source: specs/crowd/crowd.pillar.v2.yml
   * HTTP: POST /api/v1/crowd/member-charges/:chargeId/mark-charged
   */
  async markMemberCharged(
    chargeId: number,
    dto: MemberChargeMarkChargedDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: Read charge, check exists + status in ['planned','charging']
      const charge = await this.crowdMemberChargeRepo.findById(chargeId, queryRunner);
      if (!charge) {
        throw new NotFoundException({
          code: 'MEMBER_CHARGE_NOT_FOUND',
          message: `Member charge with id ${chargeId} not found`,
        });
      }
      if (!['planned', 'charging'].includes(charge.status)) {
        throw new ConflictException({
          code: 'INVALID_CHARGE_STATUS',
          message: `Member charge must be in 'planned' or 'charging' status, currently '${charge.status}'`,
        });
      }

      const paidAmount = parseFloat(dto.paidAmount);
      const chargeAmount = parseFloat(charge.charge_amount);
      const remainingAmount = parseFloat((chargeAmount - paidAmount).toFixed(2));

      // WRITE: Update crowd_member_charge
      await this.crowdMemberChargeRepo.update(
        chargeId,
        {
          status: 'charged',
          paid_amount: dto.paidAmount,
          remaining_amount: remainingAmount.toFixed(2),
          attempts: charge.attempts + 1,
          last_attempt_at: new Date(),
        },
        queryRunner,
      );

      // WRITE: Update crowd_period total_collected_amount += paidAmount
      await queryRunner.manager.query(
        `UPDATE crowd_period SET total_collected_amount = total_collected_amount + ? WHERE id = ?`,
        [dto.paidAmount, charge.crowd_period_id],
      );

      // EMIT: CROWD_MEMBER_CHARGED
      await this.outboxService.enqueue(
        {
          event_name: 'CROWD_MEMBER_CHARGED',
          event_version: 1,
          aggregate_type: 'MEMBER_CHARGE',
          aggregate_id: String(chargeId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `mark-charged-${chargeId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-mark-charged-${chargeId}`,
          payload: {
            charge_id: chargeId,
            status: 'charged',
            paid_amount: dto.paidAmount,
            remaining_amount: remainingAmount.toFixed(2),
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        chargeId,
        status: 'charged',
        paidAmount: dto.paidAmount,
        remainingAmount: remainingAmount.toFixed(2),
      };
    });

    return result;
  }

  /**
   * MARK MEMBER CHARGE FAILED COMMAND
   * Source: specs/crowd/crowd.pillar.v2.yml
   * HTTP: POST /api/v1/crowd/member-charges/:chargeId/mark-failed
   */
  async markMemberChargeFailed(chargeId: number, actor: Actor, idempotencyKey: string) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: Read charge, check exists + status in ['planned','charging']
      const charge = await this.crowdMemberChargeRepo.findById(chargeId, queryRunner);
      if (!charge) {
        throw new NotFoundException({
          code: 'MEMBER_CHARGE_NOT_FOUND',
          message: `Member charge with id ${chargeId} not found`,
        });
      }
      if (!['planned', 'charging'].includes(charge.status)) {
        throw new ConflictException({
          code: 'INVALID_CHARGE_STATUS',
          message: `Member charge must be in 'planned' or 'charging' status, currently '${charge.status}'`,
        });
      }

      const newAttempts = charge.attempts + 1;

      // WRITE: Update crowd_member_charge
      await this.crowdMemberChargeRepo.update(
        chargeId,
        {
          status: 'failed',
          attempts: newAttempts,
          last_attempt_at: new Date(),
        },
        queryRunner,
      );

      // EMIT: CROWD_MEMBER_CHARGE_FAILED
      await this.outboxService.enqueue(
        {
          event_name: 'CROWD_MEMBER_CHARGE_FAILED',
          event_version: 1,
          aggregate_type: 'MEMBER_CHARGE',
          aggregate_id: String(chargeId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `mark-charge-failed-${chargeId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-mark-charge-failed-${chargeId}`,
          payload: { charge_id: chargeId, status: 'failed', attempts: newAttempts },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return { chargeId, status: 'failed', attempts: newAttempts };
    });

    return result;
  }

  /**
   * MARK CLAIM PAYOUT PAID COMMAND
   * Source: specs/crowd/crowd.pillar.v2.yml
   * HTTP: POST /api/v1/crowd/claim-payouts/:payoutId/mark-paid
   */
  async markClaimPayoutPaid(
    payoutId: number,
    dto: ClaimPayoutMarkPaidDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: Read payout, check exists + status in ['planned','processing']
      const payout = await this.crowdClaimPayoutRepo.findById(payoutId, queryRunner);
      if (!payout) {
        throw new NotFoundException({
          code: 'CLAIM_PAYOUT_NOT_FOUND',
          message: `Claim payout with id ${payoutId} not found`,
        });
      }
      if (!['planned', 'processing'].includes(payout.status)) {
        throw new ConflictException({
          code: 'INVALID_PAYOUT_STATUS',
          message: `Claim payout must be in 'planned' or 'processing' status, currently '${payout.status}'`,
        });
      }

      // WRITE: Update crowd_claim_payout
      await this.crowdClaimPayoutRepo.update(
        payoutId,
        {
          status: 'paid',
          payout_ref: dto.payoutRef || null,
          ledger_txn_id: dto.ledgerTxnId || null,
        },
        queryRunner,
      );

      // WRITE: Update crowd_period_claim status='paid'
      await this.crowdPeriodClaimRepo.update(
        payout.crowd_period_claim_id,
        { status: 'paid' },
        queryRunner,
      );

      // EMIT: CROWD_CLAIM_PAYOUT_PAID
      await this.outboxService.enqueue(
        {
          event_name: 'CROWD_CLAIM_PAYOUT_PAID',
          event_version: 1,
          aggregate_type: 'CLAIM_PAYOUT',
          aggregate_id: String(payoutId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `mark-payout-paid-${payoutId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-mark-payout-paid-${payoutId}`,
          payload: {
            payout_id: payoutId,
            status: 'paid',
            payout_ref: dto.payoutRef || null,
            ledger_txn_id: dto.ledgerTxnId || null,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        payoutId,
        status: 'paid',
        payoutRef: dto.payoutRef || null,
        ledgerTxnId: dto.ledgerTxnId || null,
      };
    });

    return result;
  }

  /**
   * MARK CLAIM PAYOUT FAILED COMMAND
   * Source: specs/crowd/crowd.pillar.v2.yml
   * HTTP: POST /api/v1/crowd/claim-payouts/:payoutId/mark-failed
   */
  async markClaimPayoutFailed(
    payoutId: number,
    failureReason: string | undefined,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: Read payout, check exists + status in ['planned','processing']
      const payout = await this.crowdClaimPayoutRepo.findById(payoutId, queryRunner);
      if (!payout) {
        throw new NotFoundException({
          code: 'CLAIM_PAYOUT_NOT_FOUND',
          message: `Claim payout with id ${payoutId} not found`,
        });
      }
      if (!['planned', 'processing'].includes(payout.status)) {
        throw new ConflictException({
          code: 'INVALID_PAYOUT_STATUS',
          message: `Claim payout must be in 'planned' or 'processing' status, currently '${payout.status}'`,
        });
      }

      // WRITE: Update crowd_claim_payout
      await this.crowdClaimPayoutRepo.update(
        payoutId,
        {
          status: 'failed',
          failure_reason: failureReason || null,
        },
        queryRunner,
      );

      // EMIT: CROWD_CLAIM_PAYOUT_FAILED
      await this.outboxService.enqueue(
        {
          event_name: 'CROWD_CLAIM_PAYOUT_FAILED',
          event_version: 1,
          aggregate_type: 'CLAIM_PAYOUT',
          aggregate_id: String(payoutId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `mark-payout-failed-${payoutId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-mark-payout-failed-${payoutId}`,
          payload: {
            payout_id: payoutId,
            status: 'failed',
            failure_reason: failureReason || null,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return { payoutId, status: 'failed' };
    });

    return result;
  }
}
