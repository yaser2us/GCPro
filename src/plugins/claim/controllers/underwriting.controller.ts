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
import { UnderwritingDecisionDto } from '../dtos/underwriting-decision.dto';
import { UnderwritingEvidenceDto } from '../dtos/underwriting-evidence.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * Underwriting Controller
 * Handles HTTP endpoints for medical underwriting operations
 *
 * Based on specs/claim/claim.pillar.v2.yml commands section
 */
@Controller('/api/v1/underwriting')
@UseGuards(AuthGuard, PermissionsGuard)
export class UnderwritingController {
  constructor(private readonly workflowService: ClaimWorkflowService) {}

  /**
   * RECORD UNDERWRITING DECISION ENDPOINT
   * Spec: specs/claim/claim.pillar.v2.yml lines 2215-2248
   */
  @Post(':caseId/record-decision')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('underwriting:record-decision')
  async recordUnderwritingDecision(
    @Param('caseId') caseId: string,
    @Body() request: UnderwritingDecisionDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.recordUnderwritingDecision(
      Number(caseId),
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * ADD UNDERWRITING EVIDENCE ENDPOINT
   * Spec: specs/claim/claim.pillar.v2.yml lines 2249-2268
   */
  @Post(':caseId/add-evidence')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('underwriting:add-evidence')
  async addUnderwritingEvidence(
    @Param('caseId') caseId: string,
    @Body() request: UnderwritingEvidenceDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.addUnderwritingEvidence(
      Number(caseId),
      request,
      actor,
      idempotencyKey,
    );
  }
}
