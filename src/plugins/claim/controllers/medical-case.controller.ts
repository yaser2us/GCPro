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
import { MedicalCaseCreateDto } from '../dtos/medical-case-create.dto';
import { MedicalCaseUpdateDto } from '../dtos/medical-case-update.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * Medical Case Controller
 * Handles HTTP endpoints for medical case operations
 *
 * Based on specs/claim/claim.pillar.v2.yml commands section
 */
@Controller('/api/v1/medical-case')
@UseGuards(AuthGuard, PermissionsGuard)
export class MedicalCaseController {
  constructor(private readonly workflowService: ClaimWorkflowService) {}

  /**
   * CREATE MEDICAL CASE ENDPOINT
   * Spec: specs/claim/claim.pillar.v2.yml lines 2170-2192
   */
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('medical-case:create')
  async createMedicalCase(
    @Body() request: MedicalCaseCreateDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.createMedicalCase(
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * UPDATE MEDICAL CASE ENDPOINT
   * Spec: specs/claim/claim.pillar.v2.yml lines 2193-2214
   */
  @Post(':medicalCaseId/update')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('medical-case:update')
  async updateMedicalCase(
    @Param('medicalCaseId') medicalCaseId: string,
    @Body() request: MedicalCaseUpdateDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.updateMedicalCase(
      Number(medicalCaseId),
      request,
      actor,
      idempotencyKey,
    );
  }
}
