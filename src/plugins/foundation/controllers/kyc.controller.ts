import { Controller, Post, Param, Body, UseGuards, HttpCode, HttpStatus, Headers, BadRequestException } from '@nestjs/common';
import { FoundationWorkflowService } from '../services/foundation.workflow.service';
import { KYCUpsertDto } from '../dtos/kyc-upsert.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * KYCController
 * Handles KYC record management.
 * Based on specs/foundation/foundation.pillar.v2.yml
 */
@Controller('/api/v1/foundation')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('foundation:admin')
export class KYCController {
  constructor(private readonly workflowService: FoundationWorkflowService) {}

  /** POST /api/v1/foundation/kyc */
  @Post('kyc')
  @HttpCode(HttpStatus.CREATED)
  async upsertKYC(
    @Body() dto: KYCUpsertDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.upsertKYC(dto, actor, idempotencyKey);
  }

  /** POST /api/v1/foundation/kyc/:kycId/verify */
  @Post('kyc/:kycId/verify')
  @HttpCode(HttpStatus.OK)
  async verifyKYC(
    @Param('kycId') kycId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.verifyKYC(Number(kycId), actor, idempotencyKey);
  }

  /** POST /api/v1/foundation/kyc/:kycId/reject */
  @Post('kyc/:kycId/reject')
  @HttpCode(HttpStatus.OK)
  async rejectKYC(
    @Param('kycId') kycId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.rejectKYC(Number(kycId), actor, idempotencyKey);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // M3: IC PRE-CHECK
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * POST /api/v1/foundation/kyc/check-ic
   * Pre-check if an IC/NRIC is already registered. No idempotency key needed (read-only).
   * Permission: foundation:kyc:check (or any authenticated actor — registration wizard use case)
   */
  @Post('kyc/check-ic')
  @HttpCode(HttpStatus.OK)
  async checkIC(
    @Body() body: { ic_no: string; id_type?: string },
    @CurrentActor() _actor: Actor,
  ) {
    if (!body?.ic_no) throw new BadRequestException('ic_no is required');
    return this.workflowService.checkIC(body.ic_no, body.id_type);
  }
}
