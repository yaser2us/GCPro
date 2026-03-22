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
import { GuaranteeLetterIssueDto } from '../dtos/guarantee-letter-issue.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * Guarantee Letter Controller
 * Handles HTTP endpoints for guarantee letter operations
 *
 * Based on specs/claim/claim.pillar.v2.yml commands section
 */
@Controller('/api/v1/guarantee-letter')
@UseGuards(AuthGuard, PermissionsGuard)
export class GuaranteeLetterController {
  constructor(private readonly workflowService: ClaimWorkflowService) {}

  /**
   * ISSUE GUARANTEE LETTER ENDPOINT
   * Spec: specs/claim/claim.pillar.v2.yml lines 2127-2150
   */
  @Post('issue')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('guarantee-letter:issue')
  async issueGuaranteeLetter(
    @Body() request: GuaranteeLetterIssueDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.issueGuaranteeLetter(
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * CANCEL GUARANTEE LETTER ENDPOINT
   * Spec: specs/claim/claim.pillar.v2.yml lines 2151-2169
   */
  @Post(':glId/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('guarantee-letter:cancel')
  async cancelGuaranteeLetter(
    @Param('glId') glId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.cancelGuaranteeLetter(
      Number(glId),
      actor,
      idempotencyKey,
    );
  }
}
