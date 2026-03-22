import { Controller, Post, Param, Body, UseGuards, HttpCode, HttpStatus, Headers } from '@nestjs/common';
import { FoundationWorkflowService } from '../services/foundation.workflow.service';
import { AddressAddDto } from '../dtos/address-add.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * AddressController
 * Handles address management for any owner entity.
 * Based on specs/foundation/foundation.pillar.v2.yml
 */
@Controller('/api/v1/foundation')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('foundation:admin')
export class AddressController {
  constructor(private readonly workflowService: FoundationWorkflowService) {}

  /** POST /api/v1/foundation/addresses */
  @Post('addresses')
  @HttpCode(HttpStatus.CREATED)
  async addAddress(
    @Body() dto: AddressAddDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.addAddress(dto, actor, idempotencyKey);
  }

  /** POST /api/v1/foundation/addresses/:addressId/set-default */
  @Post('addresses/:addressId/set-default')
  @HttpCode(HttpStatus.OK)
  async setDefaultAddress(
    @Param('addressId') addressId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.setDefaultAddress(Number(addressId), actor, idempotencyKey);
  }
}
