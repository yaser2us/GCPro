import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Headers } from '@nestjs/common';
import { FoundationWorkflowService } from '../services/foundation.workflow.service';
import { AgeBandUpsertDto } from '../dtos/age-band-upsert.dto';
import { SmokProfileUpsertDto } from '../dtos/smok-profile-upsert.dto';
import { GeoStateUpsertDto } from '../dtos/geo-state-upsert.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * ReferenceDataController
 * Handles reference/lookup data: age bands, smoker profiles, geo states.
 * Based on specs/foundation/foundation.pillar.v2.yml
 */
@Controller('/api/v1/foundation')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('foundation:admin')
export class ReferenceDataController {
  constructor(private readonly workflowService: FoundationWorkflowService) {}

  /** POST /api/v1/foundation/age-bands */
  @Post('age-bands')
  @HttpCode(HttpStatus.OK)
  async upsertAgeBand(
    @Body() dto: AgeBandUpsertDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.upsertAgeBand(dto, actor, idempotencyKey);
  }

  /** POST /api/v1/foundation/smoker-profiles */
  @Post('smoker-profiles')
  @HttpCode(HttpStatus.OK)
  async upsertSmokProfile(
    @Body() dto: SmokProfileUpsertDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.upsertSmokProfile(dto, actor, idempotencyKey);
  }

  /** POST /api/v1/foundation/geo-states */
  @Post('geo-states')
  @HttpCode(HttpStatus.OK)
  async upsertGeoState(
    @Body() dto: GeoStateUpsertDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.upsertGeoState(dto, actor, idempotencyKey);
  }
}
