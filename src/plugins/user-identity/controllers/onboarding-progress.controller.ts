import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Headers } from '@nestjs/common';
import { UserIdentityWorkflowService } from '../services/user-identity.workflow.service';
import { OnboardingProgressUpsertDto } from '../dtos/onboarding-progress-upsert.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * OnboardingProgressController
 * Handles onboarding step progress upserts per user.
 * Based on specs/user-identity/user-identity.pillar.v2.yml
 */
@Controller('/api/v1/user-identity')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('user-identity:admin')
export class OnboardingProgressController {
  constructor(private readonly workflowService: UserIdentityWorkflowService) {}

  /** POST /api/v1/user-identity/onboarding-progress */
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
