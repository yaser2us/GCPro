import {
  Controller,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { ClaimWorkflowService } from '../services/claim.workflow.service';
import { MedicalProviderCreateDto } from '../dtos/medical-provider-create.dto';
import { MedicalProviderUpdateDto } from '../dtos/medical-provider-update.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * Medical Provider Admin Controller
 * Handles HTTP endpoints for medical provider admin operations
 *
 * Based on specs/claim/claim.pillar.v2.yml commands section
 */
@Controller('/api/v1/admin/medical-provider')
@UseGuards(AuthGuard, PermissionsGuard)
export class MedicalProviderAdminController {
  constructor(private readonly workflowService: ClaimWorkflowService) {}

  /**
   * CREATE MEDICAL PROVIDER ENDPOINT
   * Spec: specs/claim/claim.pillar.v2.yml MedicalProvider.Create
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('claim:admin')
  async createMedicalProvider(
    @Body() request: MedicalProviderCreateDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.createMedicalProvider(
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * UPDATE MEDICAL PROVIDER ENDPOINT
   * Spec: specs/claim/claim.pillar.v2.yml MedicalProvider.Update
   */
  @Put(':providerId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('claim:admin')
  async updateMedicalProvider(
    @Param('providerId') providerId: string,
    @Body() request: MedicalProviderUpdateDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.updateMedicalProvider(
      Number(providerId),
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * DEACTIVATE MEDICAL PROVIDER ENDPOINT
   * Spec: specs/claim/claim.pillar.v2.yml MedicalProvider.Deactivate
   */
  @Post(':providerId/deactivate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('claim:admin')
  async deactivateMedicalProvider(
    @Param('providerId') providerId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.deactivateMedicalProvider(
      Number(providerId),
      actor,
      idempotencyKey,
    );
  }
}
