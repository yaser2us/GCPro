import { Controller, Post, Body, Param, UseGuards, HttpCode, HttpStatus, Headers } from '@nestjs/common';
import { IdentityWorkflowService } from '../services/identity.workflow.service';
import { DeviceTokenRegisterDto } from '../dto/device-token-register.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * IdentityDeviceTokenController
 * Handles RegisterDevice and RevokeDevice endpoints.
 * Source: specs/identity/identity.pillar.v2.yml — RegisterDevice, RevokeDevice commands
 */
@Controller('v1/identity')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('identity:admin')
export class IdentityDeviceTokenController {
  constructor(private readonly workflowService: IdentityWorkflowService) {}

  /** POST /v1/identity/device-tokens */
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

  /** POST /v1/identity/device-tokens/:deviceTokenId/revoke */
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
