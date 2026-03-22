import { Controller, Post, Param, Body, UseGuards, HttpCode, HttpStatus, Headers } from '@nestjs/common';
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
}
