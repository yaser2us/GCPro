import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Headers } from '@nestjs/common';
import { IdentityWorkflowService } from '../services/identity.workflow.service';
import { OnboardingProgressUpsertDto } from '../dto/onboarding-progress-upsert.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * IdentityOnboardingProgressController
 * Handles UpsertOnboardingProgress endpoint.
 * Source: specs/identity/identity.pillar.v2.yml — UpsertOnboardingProgress command
 */
@Controller('v1/identity')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('identity:admin')
export class IdentityOnboardingProgressController {
  constructor(private readonly workflowService: IdentityWorkflowService) {}

  /** POST /v1/identity/onboarding-progress */
  @Post('onboarding-progress')
  @HttpCode(HttpStatus.OK)
  async upsertOnboardingProgress(
    @Body() dto: OnboardingProgressUpsertDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.upsertOnboardingProgress(dto, actor, idempotencyKey);
  }
}
