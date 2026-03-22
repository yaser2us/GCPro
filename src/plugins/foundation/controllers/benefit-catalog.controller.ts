import { Controller, Post, Param, Body, UseGuards, HttpCode, HttpStatus, Headers } from '@nestjs/common';
import { FoundationWorkflowService } from '../services/foundation.workflow.service';
import { BenefitCatalogCreateDto } from '../dtos/benefit-catalog-create.dto';
import { BenefitCatalogItemCreateDto } from '../dtos/benefit-catalog-item-create.dto';
import { BenefitLevelCreateDto } from '../dtos/benefit-level-create.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * BenefitCatalogController
 * Handles benefit catalog, item, and level management.
 * Based on specs/foundation/foundation.pillar.v2.yml
 */
@Controller('/api/v1/foundation')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('foundation:admin')
export class BenefitCatalogController {
  constructor(private readonly workflowService: FoundationWorkflowService) {}

  /** POST /api/v1/foundation/benefit-catalogs */
  @Post('benefit-catalogs')
  @HttpCode(HttpStatus.CREATED)
  async createBenefitCatalog(
    @Body() dto: BenefitCatalogCreateDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.createBenefitCatalog(dto, actor, idempotencyKey);
  }

  /** POST /api/v1/foundation/benefit-catalogs/:catalogId/archive */
  @Post('benefit-catalogs/:catalogId/archive')
  @HttpCode(HttpStatus.OK)
  async archiveBenefitCatalog(
    @Param('catalogId') catalogId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.archiveBenefitCatalog(Number(catalogId), actor, idempotencyKey);
  }

  /** POST /api/v1/foundation/benefit-catalogs/:catalogId/items */
  @Post('benefit-catalogs/:catalogId/items')
  @HttpCode(HttpStatus.CREATED)
  async createBenefitCatalogItem(
    @Param('catalogId') catalogId: string,
    @Body() dto: BenefitCatalogItemCreateDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.createBenefitCatalogItem(Number(catalogId), dto, actor, idempotencyKey);
  }

  /** POST /api/v1/foundation/benefit-catalogs/:catalogId/levels */
  @Post('benefit-catalogs/:catalogId/levels')
  @HttpCode(HttpStatus.CREATED)
  async createBenefitLevel(
    @Param('catalogId') catalogId: string,
    @Body() dto: BenefitLevelCreateDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.createBenefitLevel(Number(catalogId), dto, actor, idempotencyKey);
  }
}
