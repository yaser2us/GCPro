import { Controller, Post, Body, Param, UseGuards, HttpCode, HttpStatus, Headers } from '@nestjs/common';
import { IdentityWorkflowService } from '../services/identity.workflow.service';
import { RegistrationTokenIssueDto } from '../dto/registration-token-issue.dto';
import { RegistrationTokenVerifyDto } from '../dto/registration-token-verify.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * IdentityRegistrationTokenController
 * Handles Issue, Verify, Consume, Expire token endpoints.
 * Source: specs/identity/identity.pillar.v2.yml — RegistrationToken commands
 */
@Controller('v1/identity')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('identity:admin')
export class IdentityRegistrationTokenController {
  constructor(private readonly workflowService: IdentityWorkflowService) {}

  /** POST /v1/identity/registration-tokens */
  @Post('registration-tokens')
  @HttpCode(HttpStatus.CREATED)
  async issueRegistrationToken(
    @Body() dto: RegistrationTokenIssueDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.issueRegistrationToken(dto, actor, idempotencyKey);
  }

  /** POST /v1/identity/registration-tokens/:registrationTokenId/verify */
  @Post('registration-tokens/:registrationTokenId/verify')
  @HttpCode(HttpStatus.OK)
  async verifyRegistrationToken(
    @Param('registrationTokenId') registrationTokenId: string,
    @Body() dto: RegistrationTokenVerifyDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.verifyRegistrationToken(Number(registrationTokenId), dto, actor, idempotencyKey);
  }

  /** POST /v1/identity/registration-tokens/:registrationTokenId/consume */
  @Post('registration-tokens/:registrationTokenId/consume')
  @HttpCode(HttpStatus.OK)
  async consumeRegistrationToken(
    @Param('registrationTokenId') registrationTokenId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.consumeRegistrationToken(Number(registrationTokenId), actor, idempotencyKey);
  }

  /** POST /v1/identity/registration-tokens/:registrationTokenId/expire */
  @Post('registration-tokens/:registrationTokenId/expire')
  @HttpCode(HttpStatus.OK)
  async expireRegistrationToken(
    @Param('registrationTokenId') registrationTokenId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.expireRegistrationToken(Number(registrationTokenId), actor, idempotencyKey);
  }
}
