import { Controller, Post, Param, Body, UseGuards, HttpCode, HttpStatus, Headers } from '@nestjs/common';
import { FoundationWorkflowService } from '../services/foundation.workflow.service';
import { DiscountProgramCreateDto } from '../dtos/discount-program-create.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * DiscountProgramController
 * Handles discount program creation and lifecycle.
 * Based on specs/foundation/foundation.pillar.v2.yml
 */
@Controller('/api/v1/foundation')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('foundation:admin')
export class DiscountProgramController {
  constructor(private readonly workflowService: FoundationWorkflowService) {}

  /** POST /api/v1/foundation/discount-programs */
  @Post('discount-programs')
  @HttpCode(HttpStatus.CREATED)
  async createDiscountProgram(
    @Body() dto: DiscountProgramCreateDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.createDiscountProgram(dto, actor, idempotencyKey);
  }

  /** POST /api/v1/foundation/discount-programs/:programId/deactivate */
  @Post('discount-programs/:programId/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivateDiscountProgram(
    @Param('programId') programId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.deactivateDiscountProgram(Number(programId), actor, idempotencyKey);
  }
}
