import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { OutboxService } from '../../../corekit/services/outbox.service';
import { PolicyRepository } from '../repositories/policy.repo';
import { PolicyPackageRepository } from '../repositories/policy-package.repo';
import { PolicyBenefitEntitlementRepository } from '../repositories/policy-benefit-entitlement.repo';
import { PolicyBenefitUsageRepository } from '../repositories/policy-benefit-usage.repo';
import { PolicyBenefitUsageEventRepository } from '../repositories/policy-benefit-usage-event.repo';
import { PolicyBillingPlanRepository } from '../repositories/policy-billing-plan.repo';
import { PolicyDepositRequirementRepository } from '../repositories/policy-deposit-requirement.repo';
import { PolicyDiscountAppliedRepository } from '../repositories/policy-discount-applied.repo';
import { PolicyInstallmentRepository } from '../repositories/policy-installment.repo';
import { PolicyMemberRepository } from '../repositories/policy-member.repo';
import { PolicyPackageRateRepository } from '../repositories/policy-package-rate.repo';
import { PolicyRemediationCaseRepository } from '../repositories/policy-remediation-case.repo';
import { PolicyStatusEventRepository } from '../repositories/policy-status-event.repo';
import { CreatePolicyRequestDto } from '../dtos/create-policy.request.dto';
import { ActivatePolicyRequestDto } from '../dtos/activate-policy.request.dto';
import { AddPolicyMemberRequestDto } from '../dtos/add-policy-member.request.dto';
import { ReserveBenefitUsageRequestDto } from '../dtos/reserve-benefit-usage.request.dto';
import { ConfirmBenefitUsageRequestDto } from '../dtos/confirm-benefit-usage.request.dto';
import { CreateBillingPlanRequestDto } from '../dtos/create-billing-plan.request.dto';
import { PayInstallmentRequestDto } from '../dtos/pay-installment.request.dto';
import { CreateRemediationCaseRequestDto } from '../dtos/create-remediation-case.request.dto';
import { EvaluateDepositRequirementRequestDto } from '../dtos/evaluate-deposit-requirement.request.dto';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * Policy Workflow Service
 * Implements policy commands following the workflow discipline:
 * Guard → Write → Emit → Commit
 *
 * Based on specs/policy/policy.pillar.v2.yml
 */
@Injectable()
export class PolicyWorkflowService {
  constructor(
    private readonly txService: TransactionService,
    private readonly outboxService: OutboxService,
    private readonly policyRepo: PolicyRepository,
    private readonly packageRepo: PolicyPackageRepository,
    private readonly entitlementRepo: PolicyBenefitEntitlementRepository,
    private readonly usageRepo: PolicyBenefitUsageRepository,
    private readonly usageEventRepo: PolicyBenefitUsageEventRepository,
    private readonly billingPlanRepo: PolicyBillingPlanRepository,
    private readonly depositReqRepo: PolicyDepositRequirementRepository,
    private readonly discountRepo: PolicyDiscountAppliedRepository,
    private readonly installmentRepo: PolicyInstallmentRepository,
    private readonly memberRepo: PolicyMemberRepository,
    private readonly rateRepo: PolicyPackageRateRepository,
    private readonly remediationRepo: PolicyRemediationCaseRepository,
    private readonly statusEventRepo: PolicyStatusEventRepository,
  ) {}

  /**
   * CREATE POLICY COMMAND
   * Source: specs/policy/policy.pillar.v2.yml lines 1666-1722
   *
   * HTTP: POST /api/v1/policy/create
   */
  async createPolicy(
    request: CreatePolicyRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: Validate package exists
      const packageEntity = await this.packageRepo.findByCode(request.package_code, queryRunner);
      if (!packageEntity) {
        throw new NotFoundException({
          code: 'PACKAGE_NOT_FOUND',
          message: `Package with code ${request.package_code} not found`,
        });
      }

      // Generate unique policy number
      const policyNumber = `POL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // WRITE: Create policy
      const policyId = await this.policyRepo.upsert(
        {
          policy_number: policyNumber,
          account_id: Number(request.account_id),
          holder_person_id: Number(request.holder_person_id),
          status: 'pending',
          package_code_snapshot: request.package_code,
          auto_renew: request.auto_renew ? 1 : 0,
          start_at: request.start_at ? new Date(request.start_at) : null,
        },
        queryRunner,
      );

      // WRITE: Add holder as primary member
      await this.memberRepo.upsert(
        {
          policy_id: policyId,
          person_id: Number(request.holder_person_id),
          role: 'holder',
          status: 'active',
        },
        queryRunner,
      );

      // WRITE: Create benefit entitlement with JSON snapshot
      // Query benefit_catalog_item to get all benefits for the catalog
      const catalogItems = await queryRunner.manager.query(
        `SELECT item_code, name, category, limit_type, limit_amount, limit_count, calculation_mode
         FROM benefit_catalog_item
         WHERE catalog_id = (SELECT id FROM benefit_catalog WHERE code = ? AND status = 'active' LIMIT 1)
           AND status = 'active'`,
        [packageEntity.meta?.benefit_catalog_code || 'STANDARD_2024']
      );

      // Build benefits JSON array
      const benefitsArray = catalogItems.map((item: any) => ({
        item_code: item.item_code,
        annual_limit_amount: parseFloat(item.limit_amount),
        annual_limit_count: item.limit_count,
      }));

      // Get catalog metadata
      const catalog = await queryRunner.manager.query(
        `SELECT code, version FROM benefit_catalog WHERE code = ? AND status = 'active' LIMIT 1`,
        [packageEntity.meta?.benefit_catalog_code || 'STANDARD_2024']
      );

      const catalogCode = catalog[0]?.code || 'STANDARD_2024';
      const catalogVersion = catalog[0]?.version || 'v2024';

      await this.entitlementRepo.create(
        {
          policy_id: policyId,
          catalog_code_snapshot: catalogCode,
          catalog_version_snapshot: catalogVersion,
          level_code_snapshot: packageEntity.meta?.level_code || 'BASIC',
          status: 'active',
          start_at: request.start_at ? new Date(request.start_at) : new Date(),
          end_at: null,
          entitlement_json: JSON.stringify({
            catalog_code: catalogCode,
            catalog_version: catalogVersion,
            level_code: packageEntity.meta?.level_code || 'BASIC',
            benefits: benefitsArray,
          }),
        },
        queryRunner,
      );

      // WRITE: Create deposit requirement based on package
      const monthlyMaxCap = parseFloat(packageEntity.monthly_max_cap_default || '0');
      const depositCapacityMultiplier = parseFloat(packageEntity.deposit_capacity_multiplier || '2.0');
      const minDepositPct = parseFloat(packageEntity.min_deposit_pct || '0.5');
      const warningPct = parseFloat(packageEntity.warning_pct || '0.6');
      const urgentPct = parseFloat(packageEntity.urgent_pct || '0.5');

      const depositCapacity = monthlyMaxCap > 0 ? monthlyMaxCap * depositCapacityMultiplier : 10000;

      await this.depositReqRepo.create(
        {
          policy_id: policyId,
          monthly_max_cap: String(monthlyMaxCap),
          deposit_capacity_amount: String(depositCapacity),
          min_required_amount: String(depositCapacity * minDepositPct),
          warning_amount: String(depositCapacity * warningPct),
          urgent_amount: String(depositCapacity * urgentPct),
          status: 'ok',
        },
        queryRunner,
      );

      // WRITE: Record status event
      await this.statusEventRepo.create(
        {
          policy_id: policyId,
          event_type: 'POLICY_CREATED',
          to_status: 'pending',
          trigger_code: 'policy.create',
          actor_type: (actor.actor_role as 'user' | 'system' | 'admin') || 'system',
          actor_id: actor.actor_user_id ? Number(actor.actor_user_id) : null,
        },
        queryRunner,
      );

      // EMIT: POLICY_CREATED event
      await this.outboxService.enqueue(
        {
          event_name: 'POLICY_CREATED',
          event_version: 1,
          aggregate_type: 'POLICY',
          aggregate_id: String(policyId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `create-policy-${policyId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-create-policy-${policyId}`,
          payload: {
            policy_id: policyId,
            policy_number: policyNumber,
            account_id: request.account_id,
            holder_person_id: request.holder_person_id,
            package_code: request.package_code,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        policy_id: policyId,
        policy_number: policyNumber,
        status: 'pending',
      };
    });

    return result;
  }

  /**
   * ACTIVATE POLICY COMMAND
   * Source: specs/policy/policy.pillar.v2.yml lines 1723-1763
   *
   * HTTP: POST /api/v1/policy/:policyId/activate
   */
  async activatePolicy(
    request: ActivatePolicyRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: policy
      const policy = await this.policyRepo.findById(Number(request.policy_id), queryRunner);
      if (!policy) {
        throw new NotFoundException({
          code: 'POLICY_NOT_FOUND',
          message: `Policy with id ${request.policy_id} not found`,
        });
      }

      // GUARD: Policy must be in pending status
      if (policy.status !== 'pending') {
        throw new ConflictException({
          code: 'POLICY_NOT_PENDING',
          message: `Policy must be pending to activate`,
        });
      }

      // WRITE: Update policy status
      await this.policyRepo.update(
        Number(request.policy_id),
        {
          status: 'active',
          start_at: new Date(),
        },
        queryRunner,
      );

      // WRITE: Record status event
      await this.statusEventRepo.create(
        {
          policy_id: Number(request.policy_id),
          event_type: 'POLICY_ACTIVATED',
          from_status: 'pending',
          to_status: 'active',
          trigger_code: 'policy.activate',
          actor_type: (actor.actor_role as 'user' | 'system' | 'admin') || 'system',
          actor_id: actor.actor_user_id ? Number(actor.actor_user_id) : null,
        },
        queryRunner,
      );

      // EMIT: POLICY_ACTIVATED event
      await this.outboxService.enqueue(
        {
          event_name: 'POLICY_ACTIVATED',
          event_version: 1,
          aggregate_type: 'POLICY',
          aggregate_id: String(request.policy_id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `activate-policy-${request.policy_id}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-activate-policy-${request.policy_id}`,
          payload: {
            policy_id: request.policy_id,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        policy_id: request.policy_id,
        status: 'active',
      };
    });

    return result;
  }

  /**
   * ADD MEMBER COMMAND
   * Source: specs/policy/policy.pillar.v2.yml lines 1764-1797
   *
   * HTTP: POST /api/v1/policy/:policyId/members/add
   */
  async addMember(
    request: AddPolicyMemberRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: policy
      const policy = await this.policyRepo.findById(Number(request.policy_id), queryRunner);
      if (!policy) {
        throw new NotFoundException({
          code: 'POLICY_NOT_FOUND',
          message: `Policy with id ${request.policy_id} not found`,
        });
      }

      // GUARD: Policy must be active
      if (policy.status !== 'active') {
        throw new ConflictException({
          code: 'POLICY_NOT_ACTIVE',
          message: `Policy must be active to add members`,
        });
      }

      // WRITE: Upsert policy_member
      const memberId = await this.memberRepo.upsert(
        {
          policy_id: Number(request.policy_id),
          person_id: Number(request.person_id),
          role: request.role,
          status: 'active',
        },
        queryRunner,
      );

      // EMIT: POLICY_MEMBER_ADDED event
      await this.outboxService.enqueue(
        {
          event_name: 'POLICY_MEMBER_ADDED',
          event_version: 1,
          aggregate_type: 'POLICY',
          aggregate_id: String(request.policy_id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `add-member-${memberId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-add-member-${memberId}`,
          payload: {
            policy_member_id: memberId,
            policy_id: request.policy_id,
            person_id: request.person_id,
            role: request.role,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        policy_member_id: memberId,
        status: 'active',
      };
    });

    return result;
  }

  /**
   * RESERVE BENEFIT USAGE COMMAND
   * Source: specs/policy/policy.pillar.v2.yml lines 1798-1845
   *
   * HTTP: POST /api/v1/policy/benefit-usage/reserve
   */
  async reserveBenefitUsage(
    request: ReserveBenefitUsageRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: policy
      const policy = await this.policyRepo.findById(Number(request.policy_id), queryRunner);
      if (!policy) {
        throw new NotFoundException({
          code: 'POLICY_NOT_FOUND',
          message: `Policy with id ${request.policy_id} not found`,
        });
      }

      // GUARD: Policy must be active
      if (policy.status !== 'active') {
        throw new ConflictException({
          code: 'POLICY_NOT_ACTIVE',
          message: `Policy must be active to reserve benefits`,
        });
      }

      // LOAD: active entitlement
      const entitlement = await this.entitlementRepo.findActiveByPolicyId(
        Number(request.policy_id),
        queryRunner,
      );
      if (!entitlement) {
        throw new NotFoundException({
          code: 'NO_ACTIVE_ENTITLEMENT',
          message: `No active benefit entitlement found for policy ${request.policy_id}`,
        });
      }

      // GUARD: Validate limits from entitlement JSON
      // Note: TypeORM automatically parses JSON columns, so entitlement_json is already an object
      const entitlementData = entitlement.entitlement_json;
      const benefitConfig = entitlementData.benefits?.find(
        (b: any) => b.item_code === request.item_code
      );

      if (!benefitConfig) {
        throw new NotFoundException({
          code: 'BENEFIT_NOT_FOUND',
          message: `Benefit ${request.item_code} not found in entitlement`,
        });
      }

      // WRITE: Upsert policy_benefit_usage with increment
      const usage = await this.usageRepo.findByPolicyPeriodItem(
        Number(request.policy_id),
        request.period_key,
        request.item_code,
        queryRunner,
      );

      // GUARD: Check if new reservation would exceed annual limits
      const currentUsed = usage ? parseFloat(usage.used_amount) : 0;
      const currentReserved = usage ? parseFloat(usage.reserved_amount) : 0;
      const newTotal = currentUsed + currentReserved + request.amount;

      if (benefitConfig.annual_limit_amount && newTotal > benefitConfig.annual_limit_amount) {
        throw new BadRequestException({
          code: 'ANNUAL_LIMIT_EXCEEDED',
          message: `Annual limit exceeded for ${request.item_code}. Limit: ${benefitConfig.annual_limit_amount}, Current: ${currentUsed + currentReserved}, Requested: ${request.amount}`,
        });
      }

      const usageId = await this.usageRepo.upsert(
        {
          policy_id: Number(request.policy_id),
          period_key: request.period_key,
          item_code: request.item_code,
          reserved_amount: usage
            ? String(parseFloat(usage.reserved_amount) + request.amount)
            : String(request.amount),
          reserved_count: (usage?.reserved_count || 0) + (request.count || 0),
          status: 'open',
        },
        queryRunner,
      );

      // WRITE: Insert usage event
      const eventId = await this.usageEventRepo.upsert(
        {
          usage_id: usageId,
          event_type: 'reserve',
          ref_type: request.ref_type || null,
          ref_id: request.ref_id || null,
          amount: String(request.amount),
          count: request.count || 0,
          idempotency_key: idempotencyKey,
          occurred_at: new Date(),
        },
        queryRunner,
      );

      // EMIT: BENEFIT_USAGE_RESERVED event
      await this.outboxService.enqueue(
        {
          event_name: 'BENEFIT_USAGE_RESERVED',
          event_version: 1,
          aggregate_type: 'POLICY',
          aggregate_id: String(request.policy_id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `reserve-benefit-${eventId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-reserve-benefit-${eventId}`,
          payload: {
            usage_id: usageId,
            policy_id: request.policy_id,
            period_key: request.period_key,
            item_code: request.item_code,
            reserved_amount: request.amount,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        usage_id: usageId,
        reserved_amount: request.amount,
      };
    });

    return result;
  }

  /**
   * CONFIRM BENEFIT USAGE COMMAND
   * Source: specs/policy/policy.pillar.v2.yml lines 1846-1885
   *
   * HTTP: POST /api/v1/policy/benefit-usage/confirm
   */
  async confirmBenefitUsage(
    request: ConfirmBenefitUsageRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: policy_benefit_usage
      const usage = await this.usageRepo.findByPolicyPeriodItem(
        Number(request.policy_id),
        request.period_key,
        request.item_code,
        queryRunner,
      );

      if (!usage) {
        throw new NotFoundException({
          code: 'USAGE_NOT_FOUND',
          message: `Usage record not found`,
        });
      }

      // GUARD: Validate sufficient reserved amount
      if (parseFloat(usage.reserved_amount) < request.amount) {
        throw new BadRequestException({
          code: 'INSUFFICIENT_RESERVED_AMOUNT',
          message: `Insufficient reserved amount`,
        });
      }

      // WRITE: Update usage - move from reserved to used
      await this.usageRepo.update(
        usage.id,
        {
          used_amount: String(parseFloat(usage.used_amount) + request.amount),
          used_count: usage.used_count + (request.count || 0),
          reserved_amount: String(parseFloat(usage.reserved_amount) - request.amount),
          reserved_count: usage.reserved_count - (request.count || 0),
        },
        queryRunner,
      );

      // WRITE: Insert usage event
      const eventId = await this.usageEventRepo.upsert(
        {
          usage_id: usage.id,
          event_type: 'confirm',
          ref_type: request.ref_type || null,
          ref_id: request.ref_id || null,
          amount: String(request.amount),
          count: request.count || 0,
          idempotency_key: idempotencyKey,
          occurred_at: new Date(),
        },
        queryRunner,
      );

      // EMIT: BENEFIT_USAGE_CONFIRMED event
      await this.outboxService.enqueue(
        {
          event_name: 'BENEFIT_USAGE_CONFIRMED',
          event_version: 1,
          aggregate_type: 'POLICY',
          aggregate_id: String(request.policy_id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `confirm-benefit-${eventId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-confirm-benefit-${eventId}`,
          payload: {
            usage_id: usage.id,
            used_amount: request.amount,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        usage_id: usage.id,
        used_amount: request.amount,
      };
    });

    return result;
  }

  /**
   * RELEASE BENEFIT USAGE COMMAND
   * Source: specs/policy/policy.pillar.v2.yml lines 1886-1923
   *
   * HTTP: POST /api/v1/policy/benefit-usage/release
   */
  async releaseBenefitUsage(
    request: ReserveBenefitUsageRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: policy_benefit_usage
      const usage = await this.usageRepo.findByPolicyPeriodItem(
        Number(request.policy_id),
        request.period_key,
        request.item_code,
        queryRunner,
      );

      if (!usage) {
        throw new NotFoundException({
          code: 'USAGE_NOT_FOUND',
          message: `Usage record not found`,
        });
      }

      // GUARD: Validate sufficient reserved amount
      if (parseFloat(usage.reserved_amount) < request.amount) {
        throw new BadRequestException({
          code: 'INSUFFICIENT_RESERVED_AMOUNT',
          message: `Insufficient reserved amount`,
        });
      }

      // WRITE: Update usage - release reserved
      await this.usageRepo.update(
        usage.id,
        {
          reserved_amount: String(parseFloat(usage.reserved_amount) - request.amount),
          reserved_count: usage.reserved_count - (request.count || 0),
        },
        queryRunner,
      );

      // WRITE: Insert usage event
      const eventId = await this.usageEventRepo.upsert(
        {
          usage_id: usage.id,
          event_type: 'release',
          ref_type: request.ref_type || null,
          ref_id: request.ref_id || null,
          amount: String(request.amount),
          count: request.count || 0,
          idempotency_key: idempotencyKey,
          occurred_at: new Date(),
        },
        queryRunner,
      );

      // EMIT: BENEFIT_USAGE_RELEASED event
      await this.outboxService.enqueue(
        {
          event_name: 'BENEFIT_USAGE_RELEASED',
          event_version: 1,
          aggregate_type: 'POLICY',
          aggregate_id: String(request.policy_id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `release-benefit-${eventId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-release-benefit-${eventId}`,
          payload: {
            usage_id: usage.id,
            reserved_amount: request.amount,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        usage_id: usage.id,
        reserved_amount: parseFloat(usage.reserved_amount) - request.amount,
      };
    });

    return result;
  }

  /**
   * CREATE BILLING PLAN COMMAND
   * Source: specs/policy/policy.pillar.v2.yml lines 1924-1955
   *
   * HTTP: POST /api/v1/policy/:policyId/billing-plan/create
   */
  async createBillingPlan(
    request: CreateBillingPlanRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: policy
      const policy = await this.policyRepo.findById(Number(request.policy_id), queryRunner);
      if (!policy) {
        throw new NotFoundException({
          code: 'POLICY_NOT_FOUND',
          message: `Policy with id ${request.policy_id} not found`,
        });
      }

      // WRITE: Create billing plan
      const planId = await this.billingPlanRepo.create(
        {
          policy_id: Number(request.policy_id),
          billing_type: request.billing_type,
          total_amount: String(request.total_amount),
          installment_count: request.installment_count,
          status: 'pending',
        },
        queryRunner,
      );

      // WRITE: Generate installment records based on plan
      const installmentAmount = request.total_amount / request.installment_count;
      const now = new Date();

      for (let i = 0; i < request.installment_count; i++) {
        const dueDate = new Date(now);
        dueDate.setMonth(dueDate.getMonth() + i + 1); // First installment due next month

        await this.installmentRepo.upsert(
          {
            billing_plan_id: planId,
            installment_no: i + 1,
            amount: String(installmentAmount.toFixed(2)),
            due_at: dueDate,
            status: 'pending',
            idempotency_key: `${idempotencyKey}-installment-${i + 1}`,
          },
          queryRunner,
        );
      }

      // EMIT: BILLING_PLAN_CREATED event
      await this.outboxService.enqueue(
        {
          event_name: 'BILLING_PLAN_CREATED',
          event_version: 1,
          aggregate_type: 'POLICY_BILLING_PLAN',
          aggregate_id: String(planId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `create-billing-plan-${planId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-create-billing-plan-${planId}`,
          payload: {
            billing_plan_id: planId,
            policy_id: request.policy_id,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        billing_plan_id: planId,
        installment_count: request.installment_count,
      };
    });

    return result;
  }

  /**
   * PAY INSTALLMENT COMMAND
   * Source: specs/policy/policy.pillar.v2.yml lines 1956-1987
   *
   * HTTP: POST /api/v1/policy/installment/:installmentId/pay
   */
  async payInstallment(
    request: PayInstallmentRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: policy_installment
      const installment = await this.installmentRepo.findById(
        Number(request.installment_id),
        queryRunner,
      );
      if (!installment) {
        throw new NotFoundException({
          code: 'INSTALLMENT_NOT_FOUND',
          message: `Installment with id ${request.installment_id} not found`,
        });
      }

      // GUARD: Installment must be pending or overdue
      if (!['pending', 'overdue'].includes(installment.status)) {
        throw new ConflictException({
          code: 'INSTALLMENT_ALREADY_PAID',
          message: `Installment is already paid or waived`,
        });
      }

      // WRITE: Update installment
      await this.installmentRepo.update(
        Number(request.installment_id),
        {
          status: 'paid',
          paid_at: new Date(),
          payment_method: request.payment_method,
          payment_ref: request.payment_ref || null,
        },
        queryRunner,
      );

      // WRITE: Check if all installments are paid and update billing plan
      const allInstallments = await queryRunner.manager.query(
        `SELECT COUNT(*) as total,
                SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count
         FROM policy_installment
         WHERE billing_plan_id = ?`,
        [installment.billing_plan_id]
      );

      const { total, paid_count } = allInstallments[0];
      if (total > 0 && paid_count >= total) {
        await this.billingPlanRepo.update(
          installment.billing_plan_id,
          { status: 'completed' },
          queryRunner,
        );
      }

      // EMIT: INSTALLMENT_PAID event
      await this.outboxService.enqueue(
        {
          event_name: 'INSTALLMENT_PAID',
          event_version: 1,
          aggregate_type: 'POLICY_BILLING_PLAN',
          aggregate_id: String(installment.billing_plan_id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `pay-installment-${request.installment_id}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-pay-installment-${request.installment_id}`,
          payload: {
            installment_id: request.installment_id,
            billing_plan_id: installment.billing_plan_id,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        installment_id: request.installment_id,
        status: 'paid',
      };
    });

    return result;
  }

  /**
   * EVALUATE DEPOSIT REQUIREMENT COMMAND
   * Source: specs/policy/policy.pillar.v2.yml lines 1988-2021
   *
   * HTTP: POST /api/v1/policy/:policyId/deposit/evaluate
   */
  async evaluateDepositRequirement(
    request: EvaluateDepositRequirementRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: policy_deposit_requirement
      const depositReq = await this.depositReqRepo.findByPolicyId(
        Number(request.policy_id),
        queryRunner,
      );
      if (!depositReq) {
        throw new NotFoundException({
          code: 'DEPOSIT_REQUIREMENT_NOT_FOUND',
          message: `Deposit requirement not found for policy ${request.policy_id}`,
        });
      }

      // Calculate status based on thresholds
      let status: 'ok' | 'warning' | 'urgent' | 'critical' = 'ok';
      const minRequired = parseFloat(depositReq.min_required_amount);
      const warning = parseFloat(depositReq.warning_amount);
      const urgent = parseFloat(depositReq.urgent_amount);

      if (request.current_balance < minRequired) {
        status = 'critical';
      } else if (request.current_balance < urgent) {
        status = 'urgent';
      } else if (request.current_balance < warning) {
        status = 'warning';
      }

      // WRITE: Update deposit requirement
      await this.depositReqRepo.update(
        depositReq.id,
        {
          status,
          last_evaluated_at: new Date(),
        },
        queryRunner,
      );

      // EMIT: DEPOSIT_REQUIREMENT_EVALUATED event (if status changed)
      if (status !== 'ok') {
        await this.outboxService.enqueue(
          {
            event_name: 'DEPOSIT_REQUIREMENT_EVALUATED',
            event_version: 1,
            aggregate_type: 'POLICY',
            aggregate_id: String(request.policy_id),
            actor_user_id: actor.actor_user_id,
            occurred_at: new Date(),
            correlation_id: actor.correlation_id || `evaluate-deposit-${request.policy_id}-${Date.now()}`,
            causation_id: actor.causation_id || `cmd-evaluate-deposit-${request.policy_id}`,
            payload: {
              policy_id: request.policy_id,
              status,
              current_balance: request.current_balance,
              min_required: minRequired,
            },
            dedupe_key: idempotencyKey,
          },
          queryRunner,
        );
      }

      return {
        status,
        current_amount: request.current_balance,
        required_amount: minRequired,
      };
    });

    return result;
  }

  /**
   * OPEN REMEDIATION CASE COMMAND
   * Source: specs/policy/policy.pillar.v2.yml lines 2022-2052
   *
   * HTTP: POST /api/v1/policy/:policyId/remediation/open
   */
  async openRemediationCase(
    request: CreateRemediationCaseRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: policy
      const policy = await this.policyRepo.findById(Number(request.policy_id), queryRunner);
      if (!policy) {
        throw new NotFoundException({
          code: 'POLICY_NOT_FOUND',
          message: `Policy with id ${request.policy_id} not found`,
        });
      }

      // Calculate grace end date
      const graceEndAt = request.grace_days
        ? new Date(Date.now() + request.grace_days * 24 * 60 * 60 * 1000)
        : null;

      // WRITE: Create remediation case
      const caseId = await this.remediationRepo.create(
        {
          policy_id: Number(request.policy_id),
          reason_code: request.reason_code,
          status: 'open',
          grace_end_at: graceEndAt,
          required_actions: request.required_actions || null,
        },
        queryRunner,
      );

      // EMIT: REMEDIATION_CASE_OPENED event
      await this.outboxService.enqueue(
        {
          event_name: 'REMEDIATION_CASE_OPENED',
          event_version: 1,
          aggregate_type: 'POLICY_REMEDIATION_CASE',
          aggregate_id: String(caseId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `open-remediation-${caseId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-open-remediation-${caseId}`,
          payload: {
            remediation_case_id: caseId,
            policy_id: request.policy_id,
            reason_code: request.reason_code,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        remediation_case_id: caseId,
        grace_end_at: graceEndAt?.toISOString() || null,
      };
    });

    return result;
  }

  /**
   * CLEAR REMEDIATION CASE COMMAND
   * Source: specs/policy/policy.pillar.v2.yml lines 2053-2079
   *
   * HTTP: POST /api/v1/policy/remediation/:caseId/clear
   */
  async clearRemediationCase(
    caseId: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // LOAD: policy_remediation_case
      const remediationCase = await this.remediationRepo.findById(caseId, queryRunner);
      if (!remediationCase) {
        throw new NotFoundException({
          code: 'CASE_NOT_FOUND',
          message: `Remediation case with id ${caseId} not found`,
        });
      }

      // GUARD: Case must be open or in_progress
      if (!['open', 'in_progress'].includes(remediationCase.status)) {
        throw new ConflictException({
          code: 'CASE_ALREADY_CLOSED',
          message: `Case is already closed`,
        });
      }

      // WRITE: Update case status
      await this.remediationRepo.update(
        caseId,
        {
          status: 'cleared',
          cleared_at: new Date(),
        },
        queryRunner,
      );

      // EMIT: REMEDIATION_CASE_CLEARED event
      await this.outboxService.enqueue(
        {
          event_name: 'REMEDIATION_CASE_CLEARED',
          event_version: 1,
          aggregate_type: 'POLICY_REMEDIATION_CASE',
          aggregate_id: String(caseId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `clear-remediation-${caseId}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-clear-remediation-${caseId}`,
          payload: {
            remediation_case_id: caseId,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        remediation_case_id: caseId,
        status: 'cleared',
      };
    });

    return result;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // M4: PACKAGE AUTO-SELECTION
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * PACKAGE LOOKUP
   * GET /api/v1/policy/package-lookup?dob=YYYY-MM-DD&smoker=true|false
   *
   * Calculates applicant age from DOB → finds matching age_band →
   * joins smoker_profile + policy_package_rate + policy_package →
   * returns best-fit package for use in the registration wizard.
   */
  async packageLookup(dob: string, smoker: boolean) {
    // Calculate age (years completed as of today)
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    const smokerCode = smoker ? 'smoker' : 'non_smoker';
    const now = new Date();

    // Raw SQL: join age_band + smoker_profile + policy_package_rate + policy_package
    const rows = await this.txService.run(async (queryRunner) => {
      return queryRunner.manager.query(
        `SELECT
           pp.id           AS package_id,
           pp.code         AS package_code,
           pp.name         AS package_name,
           pp.monthly_max_cap_default,
           pp.deposit_capacity_multiplier,
           pp.min_deposit_pct,
           ppr.annual_fee_amount,
           ppr.monthly_max_cap,
           ppr.weightage_factor,
           ppr.rate_version
         FROM policy_package_rate ppr
         JOIN age_band ab       ON ab.id = ppr.age_band_id
         JOIN smok_profile sp   ON sp.id = ppr.smoker_profile_id
         JOIN policy_package pp ON pp.id = ppr.package_id
         WHERE ab.min_age <= ?
           AND ab.max_age >= ?
           AND sp.code = ?
           AND ppr.effective_from <= ?
           AND (ppr.effective_to IS NULL OR ppr.effective_to > ?)
         ORDER BY ppr.effective_from DESC
         LIMIT 1`,
        [age, age, smokerCode, now, now],
      );
    });

    if (!rows || rows.length === 0) {
      throw new NotFoundException({
        code: 'PACKAGE_NOT_FOUND',
        message: `No package found for age ${age} and smoker_status ${smokerCode}`,
      });
    }

    const row = rows[0];
    const depositCapacity =
      parseFloat(row.monthly_max_cap ?? row.monthly_max_cap_default) *
      parseFloat(row.deposit_capacity_multiplier);

    return {
      package_id: row.package_id,
      package_code: row.package_code,
      package_name: row.package_name,
      annual_fee_amount: parseFloat(row.annual_fee_amount),
      monthly_max_cap: parseFloat(row.monthly_max_cap ?? row.monthly_max_cap_default),
      deposit_capacity: depositCapacity,
      weightage_factor: parseFloat(row.weightage_factor),
      rate_version: row.rate_version,
      age_at_lookup: age,
      smoker_status: smokerCode,
    };
  }
}
