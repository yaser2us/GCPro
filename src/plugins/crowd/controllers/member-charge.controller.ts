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
import { MemberChargeMarkChargedDto } from '../dtos/member-charge-mark-charged.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * MemberChargeController
 * Handles HTTP endpoints for crowd member charge operations
 * Based on specs/crowd/crowd.pillar.v2.yml
 */
@Controller('/api/v1/crowd/member-charges')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('crowd:admin')
export class MemberChargeController {
  constructor(private readonly workflowService: CrowdWorkflowService) {}

  /**
   * MARK MEMBER CHARGED
   * POST /api/v1/crowd/member-charges/:chargeId/mark-charged
   */
  @Post(':chargeId/mark-charged')
  @HttpCode(HttpStatus.OK)
  async markMemberCharged(
    @Param('chargeId') chargeId: string,
    @Body() dto: MemberChargeMarkChargedDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.markMemberCharged(Number(chargeId), dto, actor, idempotencyKey);
  }

  /**
   * MARK MEMBER CHARGE FAILED
   * POST /api/v1/crowd/member-charges/:chargeId/mark-failed
   */
  @Post(':chargeId/mark-failed')
  @HttpCode(HttpStatus.OK)
  async markMemberChargeFailed(
    @Param('chargeId') chargeId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.markMemberChargeFailed(Number(chargeId), actor, idempotencyKey);
  }
}
