import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { IdentityWorkflowService } from '../services/identity.workflow.service';
import { AuthLoginDto } from '../dto/auth-login.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * AuthController — C1: Password-based login / session management
 * Source: specs/identity/identity.pillar.v2.yml
 *
 * POST /v1/auth/login  — phone_number + password → JWT
 * GET  /v1/auth/me     — current user from JWT
 */
@Controller('v1/auth')
export class AuthController {
  constructor(private readonly workflowService: IdentityWorkflowService) {}

  /**
   * C1 — LoginWithPassword — POST /v1/auth/login
   * Unauthenticated. Returns signed JWT access token.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async loginWithPassword(@Body() dto: AuthLoginDto) {
    return this.workflowService.loginWithPassword(dto);
  }

  /**
   * GetCurrentUser — GET /v1/auth/me
   * Authenticated. Returns current user from JWT claims.
   */
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('identity:user')
  async getCurrentUser(@CurrentActor() actor: Actor) {
    return this.workflowService.getCurrentUser(actor);
  }
}
