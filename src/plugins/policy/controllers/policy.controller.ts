import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { PolicyWorkflowService } from '../services/policy.workflow.service';
import { CreatePolicyRequestDto } from '../dtos/create-policy.request.dto';
import { ActivatePolicyRequestDto } from '../dtos/activate-policy.request.dto';
import { AddPolicyMemberRequestDto } from '../dtos/add-policy-member.request.dto';
import { ReserveBenefitUsageRequestDto } from '../dtos/reserve-benefit-usage.request.dto';
import { ConfirmBenefitUsageRequestDto } from '../dtos/confirm-benefit-usage.request.dto';
import { CreateBillingPlanRequestDto } from '../dtos/create-billing-plan.request.dto';
import { PayInstallmentRequestDto } from '../dtos/pay-installment.request.dto';
import { CreateRemediationCaseRequestDto } from '../dtos/create-remediation-case.request.dto';
import { EvaluateDepositRequirementRequestDto } from '../dtos/evaluate-deposit-requirement.request.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * Policy Controller
 * Handles HTTP endpoints for policy operations
 *
 * Based on specs/policy/policy.pillar.v2.yml commands section
 */
@Controller('/api/v1/policy')
@UseGuards(AuthGuard, PermissionsGuard)
export class PolicyController {
  constructor(private readonly workflowService: PolicyWorkflowService) {}

  // ──────────────────────────────────────────────────────────────────────────
  // M4: PACKAGE AUTO-SELECTION (public — used in registration wizard)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * PACKAGE LOOKUP
   * GET /api/v1/policy/package-lookup?dob=YYYY-MM-DD&smoker=true|false
   *
   * No specific permission required — any authenticated actor can call this.
   * Used in the registration wizard before policy creation.
   */
  @Get('package-lookup')
  @HttpCode(HttpStatus.OK)
  async packageLookup(
    @Query('dob') dob: string,
    @Query('smoker') smoker: string,
  ) {
    if (!dob) {
      throw new Error('dob query parameter is required');
    }
    return this.workflowService.packageLookup(dob, smoker === 'true');
  }

  /**
   * CREATE POLICY ENDPOINT
   * Spec: specs/policy/policy.pillar.v2.yml lines 1666-1722
   */
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('policy:create')
  async createPolicy(
    @Body() request: CreatePolicyRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.createPolicy(
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * ACTIVATE POLICY ENDPOINT
   * Spec: specs/policy/policy.pillar.v2.yml lines 1723-1763
   */
  @Post(':policyId/activate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('policy:activate')
  async activatePolicy(
    @Param('policyId') policyId: string,
    @Body() request: ActivatePolicyRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    request.policy_id = policyId;

    return this.workflowService.activatePolicy(
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * ADD POLICY MEMBER ENDPOINT
   * Spec: specs/policy/policy.pillar.v2.yml lines 1764-1797
   */
  @Post(':policyId/members/add')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('policy:manage')
  async addMember(
    @Param('policyId') policyId: string,
    @Body() request: AddPolicyMemberRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    request.policy_id = policyId;

    return this.workflowService.addMember(
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * RESERVE BENEFIT USAGE ENDPOINT
   * Spec: specs/policy/policy.pillar.v2.yml lines 1798-1845
   */
  @Post('benefit-usage/reserve')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('policy:benefit:reserve')
  async reserveBenefitUsage(
    @Body() request: ReserveBenefitUsageRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.reserveBenefitUsage(
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * CONFIRM BENEFIT USAGE ENDPOINT
   * Spec: specs/policy/policy.pillar.v2.yml lines 1846-1885
   */
  @Post('benefit-usage/confirm')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('policy:benefit:confirm')
  async confirmBenefitUsage(
    @Body() request: ConfirmBenefitUsageRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.confirmBenefitUsage(
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * RELEASE BENEFIT USAGE ENDPOINT
   * Spec: specs/policy/policy.pillar.v2.yml lines 1886-1923
   */
  @Post('benefit-usage/release')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('policy:benefit:release')
  async releaseBenefitUsage(
    @Body() request: ReserveBenefitUsageRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.releaseBenefitUsage(
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * CREATE BILLING PLAN ENDPOINT
   * Spec: specs/policy/policy.pillar.v2.yml lines 1924-1955
   */
  @Post(':policyId/billing-plan/create')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('policy:billing:manage')
  async createBillingPlan(
    @Param('policyId') policyId: string,
    @Body() request: CreateBillingPlanRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    request.policy_id = policyId;

    return this.workflowService.createBillingPlan(
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * PAY INSTALLMENT ENDPOINT
   * Spec: specs/policy/policy.pillar.v2.yml lines 1956-1987
   */
  @Post('installment/:installmentId/pay')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('policy:billing:pay')
  async payInstallment(
    @Param('installmentId') installmentId: string,
    @Body() request: PayInstallmentRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    request.installment_id = installmentId;

    return this.workflowService.payInstallment(
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * GET DEPOSIT STATUS — M1
   * GET /api/v1/policy/:policyId/deposit
   */
  @Get(':policyId/deposit')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('policy:deposit:evaluate')
  async getDepositStatus(@Param('policyId') policyId: string) {
    return this.workflowService.getDepositStatus(Number(policyId));
  }

  /**
   * EVALUATE DEPOSIT REQUIREMENT ENDPOINT — M1
   * Spec: specs/policy/policy.pillar.v2.yml lines 1988-2021
   */
  @Post(':policyId/deposit/evaluate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('policy:deposit:evaluate')
  async evaluateDepositRequirement(
    @Param('policyId') policyId: string,
    @Body() request: EvaluateDepositRequirementRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    request.policy_id = policyId;

    return this.workflowService.evaluateDepositRequirement(
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * OPEN REMEDIATION CASE ENDPOINT
   * Spec: specs/policy/policy.pillar.v2.yml lines 2022-2052
   */
  @Post(':policyId/remediation/open')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('policy:remediation:manage')
  async openRemediationCase(
    @Param('policyId') policyId: string,
    @Body() request: CreateRemediationCaseRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    request.policy_id = policyId;

    return this.workflowService.openRemediationCase(
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * CLEAR REMEDIATION CASE ENDPOINT
   * Spec: specs/policy/policy.pillar.v2.yml lines 2053-2079
   */
  @Post('remediation/:caseId/clear')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('policy:remediation:manage')
  async clearRemediationCase(
    @Param('caseId') caseId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.clearRemediationCase(
      Number(caseId),
      actor,
      idempotencyKey,
    );
  }

  // ── H4: EXPIRE REMEDIATION CASE ──────────────────────────────────────────

  /** POST /api/v1/policy/remediation/:caseId/expire — H4 (system/cron) */
  @Post('remediation/:caseId/expire')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('policy:remediation:manage')
  async expireRemediationCase(
    @Param('caseId') caseId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.expireRemediationCase(Number(caseId), actor, idempotencyKey);
  }

  // ── C8: FREEZE / UNFREEZE ─────────────────────────────────────────────────

  /** POST /api/v1/policy/:policyId/freeze — C8 */
  @Post(':policyId/freeze')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('policy:status:manage')
  async freezePolicy(
    @Param('policyId') policyId: string,
    @Body('trigger_code') triggerCode: string = 'deposit_low',
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.freezePolicy(Number(policyId), triggerCode, actor, idempotencyKey);
  }

  /** POST /api/v1/policy/:policyId/unfreeze — C8 */
  @Post(':policyId/unfreeze')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('policy:status:manage')
  async unfreezePolicy(
    @Param('policyId') policyId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.unfreezePolicy(Number(policyId), actor, idempotencyKey);
  }
}
