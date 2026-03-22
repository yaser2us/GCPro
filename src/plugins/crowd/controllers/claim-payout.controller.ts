import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { CrowdWorkflowService } from '../services/crowd.workflow.service';
import { ClaimPayoutMarkPaidDto } from '../dtos/claim-payout-mark-paid.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * ClaimPayoutController
 * Handles HTTP endpoints for crowd claim payout operations
 * Based on specs/crowd/crowd.pillar.v2.yml
 */
@Controller('/api/v1/crowd/claim-payouts')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('crowd:admin')
export class ClaimPayoutController {
  constructor(private readonly workflowService: CrowdWorkflowService) {}

  /**
   * MARK CLAIM PAYOUT PAID
   * POST /api/v1/crowd/claim-payouts/:payoutId/mark-paid
   */
  @Post(':payoutId/mark-paid')
  @HttpCode(HttpStatus.OK)
  async markClaimPayoutPaid(
    @Param('payoutId') payoutId: string,
    @Body() dto: ClaimPayoutMarkPaidDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.markClaimPayoutPaid(Number(payoutId), dto, actor, idempotencyKey);
  }

  /**
   * MARK CLAIM PAYOUT FAILED
   * POST /api/v1/crowd/claim-payouts/:payoutId/mark-failed
   */
  @Post(':payoutId/mark-failed')
  @HttpCode(HttpStatus.OK)
  async markClaimPayoutFailed(
    @Param('payoutId') payoutId: string,
    @Body() body: { failureReason?: string },
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.markClaimPayoutFailed(
      Number(payoutId),
      body.failureReason,
      actor,
      idempotencyKey,
    );
  }
}
