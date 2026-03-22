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
import { CrowdPeriodCreateDto } from '../dtos/crowd-period-create.dto';
import { CrowdMemberAddDto } from '../dtos/crowd-member-add.dto';
import { CrowdClaimAddDto } from '../dtos/crowd-claim-add.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * CrowdPeriodController
 * Handles HTTP endpoints for crowd period operations
 * Based on specs/crowd/crowd.pillar.v2.yml
 */
@Controller('/api/v1/crowd/periods')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('crowd:admin')
export class CrowdPeriodController {
  constructor(private readonly workflowService: CrowdWorkflowService) {}

  /**
   * CREATE PERIOD
   * POST /api/v1/crowd/periods
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPeriod(
    @Body() dto: CrowdPeriodCreateDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.createPeriod(dto, actor, idempotencyKey);
  }

  /**
   * ADD MEMBER
   * POST /api/v1/crowd/periods/:periodId/members
   */
  @Post(':periodId/members')
  @HttpCode(HttpStatus.CREATED)
  async addMember(
    @Param('periodId') periodId: string,
    @Body() dto: CrowdMemberAddDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.addMember(Number(periodId), dto, actor, idempotencyKey);
  }

  /**
   * ADD CLAIM
   * POST /api/v1/crowd/periods/:periodId/claims
   */
  @Post(':periodId/claims')
  @HttpCode(HttpStatus.CREATED)
  async addClaim(
    @Param('periodId') periodId: string,
    @Body() dto: CrowdClaimAddDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.addClaim(Number(periodId), dto, actor, idempotencyKey);
  }

  /**
   * CALCULATE PERIOD
   * POST /api/v1/crowd/periods/:periodId/calculate
   */
  @Post(':periodId/calculate')
  @HttpCode(HttpStatus.OK)
  async calculatePeriod(
    @Param('periodId') periodId: string,
    @Body() body: { ruleVersion?: string },
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.calculatePeriod(
      Number(periodId),
      body.ruleVersion,
      actor,
      idempotencyKey,
    );
  }

  /**
   * COMPLETE PERIOD
   * POST /api/v1/crowd/periods/:periodId/complete
   */
  @Post(':periodId/complete')
  @HttpCode(HttpStatus.OK)
  async completePeriod(
    @Param('periodId') periodId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.completePeriod(Number(periodId), actor, idempotencyKey);
  }

  /**
   * CANCEL PERIOD
   * POST /api/v1/crowd/periods/:periodId/cancel
   */
  @Post(':periodId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelPeriod(
    @Param('periodId') periodId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.cancelPeriod(Number(periodId), actor, idempotencyKey);
  }
}
