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
import { ClaimWorkflowService } from '../services/claim.workflow.service';
import { ClaimSubmitDto } from '../dtos/claim-submit.dto';
import { ClaimAssignReviewerDto } from '../dtos/claim-assign-reviewer.dto';
import { ClaimDocumentDto } from '../dtos/claim-document.dto';
import { FraudSignalDto } from '../dtos/fraud-signal.dto';
import { ClaimApproveDto } from '../dtos/claim-approve.dto';
import { ClaimRejectDto } from '../dtos/claim-reject.dto';
import { ClaimSettleDto } from '../dtos/claim-settle.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * Claim Controller
 * Handles HTTP endpoints for claim operations
 *
 * Based on specs/claim/claim.pillar.v2.yml commands section
 */
@Controller('/api/v1/claim')
@UseGuards(AuthGuard, PermissionsGuard)
export class ClaimController {
  constructor(private readonly workflowService: ClaimWorkflowService) {}

  /**
   * SUBMIT CLAIM ENDPOINT
   * Spec: specs/claim/claim.pillar.v2.yml lines 1932-1968
   */
  @Post('submit')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('claim:submit')
  async submitClaim(
    @Body() request: ClaimSubmitDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.submitClaim(
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * ASSIGN REVIEWER ENDPOINT
   * Spec: specs/claim/claim.pillar.v2.yml lines 1969-1996
   */
  @Post(':claimId/assign-reviewer')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('claim:assign-reviewer')
  async assignReviewer(
    @Param('claimId') claimId: string,
    @Body() request: ClaimAssignReviewerDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.assignReviewer(
      Number(claimId),
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * ADD DOCUMENT ENDPOINT
   * Spec: specs/claim/claim.pillar.v2.yml lines 1997-2021
   */
  @Post(':claimId/documents/add')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('claim:documents:add')
  async addDocument(
    @Param('claimId') claimId: string,
    @Body() request: ClaimDocumentDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.addDocument(
      Number(claimId),
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * RECORD FRAUD SIGNAL ENDPOINT
   * Spec: specs/claim/claim.pillar.v2.yml lines 2022-2044
   */
  @Post(':claimId/fraud-signal/record')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('claim:fraud-signal:record')
  async recordFraudSignal(
    @Param('claimId') claimId: string,
    @Body() request: FraudSignalDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.recordFraudSignal(
      Number(claimId),
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * APPROVE CLAIM ENDPOINT
   * Spec: specs/claim/claim.pillar.v2.yml lines 2045-2074
   */
  @Post(':claimId/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('claim:approve')
  async approveClaim(
    @Param('claimId') claimId: string,
    @Body() request: ClaimApproveDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.approveClaim(
      Number(claimId),
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * REJECT CLAIM ENDPOINT
   * Spec: specs/claim/claim.pillar.v2.yml lines 2075-2099
   */
  @Post(':claimId/reject')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('claim:reject')
  async rejectClaim(
    @Param('claimId') claimId: string,
    @Body() request: ClaimRejectDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.rejectClaim(
      Number(claimId),
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * SETTLE CLAIM ENDPOINT
   * Spec: specs/claim/claim.pillar.v2.yml lines 2100-2126
   */
  @Post(':claimId/settle')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('claim:settle')
  async settleClaim(
    @Param('claimId') claimId: string,
    @Body() request: ClaimSettleDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.settleClaim(
      Number(claimId),
      request,
      actor,
      idempotencyKey,
    );
  }
}
