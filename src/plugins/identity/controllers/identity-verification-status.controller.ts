import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Headers } from '@nestjs/common';
import { IdentityWorkflowService } from '../services/identity.workflow.service';
import { VerificationStatusUpsertDto } from '../dto/verification-status-upsert.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * IdentityVerificationStatusController
 * Handles UpsertVerificationStatus endpoint.
 * Source: specs/identity/identity.pillar.v2.yml — UpsertVerificationStatus command
 */
@Controller('v1/identity')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('identity:admin')
export class IdentityVerificationStatusController {
  constructor(private readonly workflowService: IdentityWorkflowService) {}

  /** POST /v1/identity/verification-status */
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
