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
import { ReferralWorkflowService } from '../services/referral.workflow.service';
import { ReferralProgramCreateRequestDto } from '../dto/referral-program-create.request.dto';
import { ReferralProgramPauseRequestDto } from '../dto/referral-program-pause.request.dto';
import { ReferralCodeCreateRequestDto } from '../dto/referral-code-create.request.dto';
import { ReferralInviteCreateRequestDto } from '../dto/referral-invite-create.request.dto';
import { ReferralInviteClickRequestDto } from '../dto/referral-invite-click.request.dto';
import { ReferralConversionCreateRequestDto } from '../dto/referral-conversion-create.request.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * Referral Controller
 * Handles HTTP endpoints for referral operations
 *
 * Based on specs/referral/referral.pillar.yml commands section
 */
@Controller('/v1/referral')
@UseGuards(AuthGuard, PermissionsGuard)
export class ReferralController {
  constructor(private readonly workflowService: ReferralWorkflowService) {}

  /**
   * CREATE REFERRAL PROGRAM ENDPOINT
   *
   * Spec: specs/referral/referral.pillar.yml lines 913-953
   * HTTP: POST /v1/referral/programs
   */
  @Post('programs')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('referral:admin')
  async createReferralProgram(
    @Body() request: ReferralProgramCreateRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.createReferralProgram(
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * PAUSE REFERRAL PROGRAM ENDPOINT
   *
   * Spec: specs/referral/referral.pillar.yml lines 955-989
   * HTTP: POST /v1/referral/programs/{id}/pause
   */
  @Post('programs/:id/pause')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('referral:admin')
  async pauseReferralProgram(
    @Param('id') id: string,
    @Body() request: ReferralProgramPauseRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.pauseReferralProgram(
      Number(id),
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * ACTIVATE REFERRAL PROGRAM ENDPOINT
   *
   * Spec: specs/referral/referral.pillar.yml lines 991-1024
   * HTTP: POST /v1/referral/programs/{id}/activate
   */
  @Post('programs/:id/activate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('referral:admin')
  async activateReferralProgram(
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.activateReferralProgram(
      Number(id),
      actor,
      idempotencyKey,
    );
  }

  /**
   * CREATE REFERRAL CODE ENDPOINT
   *
   * Spec: specs/referral/referral.pillar.yml lines 1026-1066
   * HTTP: POST /v1/referral/codes
   */
  @Post('codes')
  @HttpCode(HttpStatus.CREATED)
  async createReferralCode(
    @Body() request: ReferralCodeCreateRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.createReferralCode(
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * CREATE REFERRAL INVITE ENDPOINT
   *
   * Spec: specs/referral/referral.pillar.yml lines 1068-1123
   * HTTP: POST /v1/referral/invites
   */
  @Post('invites')
  @HttpCode(HttpStatus.CREATED)
  async createReferralInvite(
    @Body() request: ReferralInviteCreateRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.createReferralInvite(
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * CLICK REFERRAL INVITE ENDPOINT
   *
   * Spec: specs/referral/referral.pillar.yml lines 1125-1168
   * HTTP: POST /v1/referral/invites/click
   */
  @Post('invites/click')
  @HttpCode(HttpStatus.OK)
  async clickReferralInvite(
    @Body() request: ReferralInviteClickRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.clickReferralInvite(
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * CREATE REFERRAL CONVERSION ENDPOINT
   *
   * Spec: specs/referral/referral.pillar.yml lines 1170-1243
   * HTTP: POST /v1/referral/conversions
   */
  @Post('conversions')
  @HttpCode(HttpStatus.CREATED)
  async createReferralConversion(
    @Body() request: ReferralConversionCreateRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.createReferralConversion(
      request,
      actor,
      idempotencyKey,
    );
  }
}
