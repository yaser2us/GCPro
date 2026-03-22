import { Controller, Post, Param, Body, UseGuards, HttpCode, HttpStatus, Headers } from '@nestjs/common';
import { UserIdentityWorkflowService } from '../services/user-identity.workflow.service';
import { DeviceTokenRegisterDto } from '../dto/device-token-register.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * DeviceTokenController
 * Handles device push token registration and revocation.
 * Based on specs/user-identity/user-identity.pillar.v2.yml
 */
@Controller('/api/v1/user-identity')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('user-identity:admin')
export class DeviceTokenController {
  constructor(private readonly workflowService: UserIdentityWorkflowService) {}

  /** POST /api/v1/user-identity/device-tokens */
  @Post('device-tokens')
  @HttpCode(HttpStatus.CREATED)
  async registerDevice(
    @Body() dto: DeviceTokenRegisterDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.registerDevice(dto, actor, idempotencyKey);
  }

  /** POST /api/v1/user-identity/device-tokens/:deviceTokenId/revoke */
  @Post('device-tokens/:deviceTokenId/revoke')
  @HttpCode(HttpStatus.OK)
  async revokeDevice(
    @Param('deviceTokenId') deviceTokenId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.revokeDevice(Number(deviceTokenId), actor, idempotencyKey);
  }
}
