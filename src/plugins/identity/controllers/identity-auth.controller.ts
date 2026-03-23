import { Controller, Post, Get, Body, Param, UseGuards, HttpCode, HttpStatus, Headers } from '@nestjs/common';
import { IdentityWorkflowService } from '../services/identity.workflow.service';
import { LoginDto } from '../dto/login.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * IdentityAuthController
 * Handles Login, Logout, and GetCurrentUser endpoints.
 * Source: specs/identity/identity.pillar.v2.yml — Login, Logout, GetCurrentUser commands
 */
@Controller('v1/identity')
export class IdentityAuthController {
  constructor(private readonly workflowService: IdentityWorkflowService) {}

  /**
   * Login — POST /v1/identity/login
   * Unauthenticated. Verifies OTP, consumes registration token, upserts device token.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Headers('idempotency-key') idempotencyKey: string,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.login(dto, idempotencyKey);
  }

  /**
   * Logout — POST /v1/identity/logout
   * Authenticated. Revokes caller's own device token.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('identity:user')
  async logout(
    @Body('device_token_id') deviceTokenId: number,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.logout(Number(deviceTokenId), actor, idempotencyKey);
  }

  /**
   * GetCurrentUser — GET /v1/identity/me
   * Authenticated. Returns the authenticated user's identity record.
   */
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('identity:user')
  async getCurrentUser(@CurrentActor() actor: Actor) {
    return this.workflowService.getCurrentUser(actor);
  }
}
