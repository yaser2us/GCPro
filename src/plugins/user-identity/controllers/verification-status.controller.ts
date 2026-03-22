import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Headers } from '@nestjs/common';
import { UserIdentityWorkflowService } from '../services/user-identity.workflow.service';
import { VerificationStatusUpsertDto } from '../dtos/verification-status-upsert.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * VerificationStatusController
 * Handles verification status upserts per account and type.
 * Based on specs/user-identity/user-identity.pillar.v2.yml
 */
@Controller('/api/v1/user-identity')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('user-identity:admin')
export class VerificationStatusController {
  constructor(private readonly workflowService: UserIdentityWorkflowService) {}

  /** POST /api/v1/user-identity/verification-status */
  @Post('verification-status')
  @HttpCode(HttpStatus.OK)
  async upsertVerificationStatus(
    @Body() dto: VerificationStatusUpsertDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.upsertVerificationStatus(dto, actor, idempotencyKey);
  }
}
