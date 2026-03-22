import { Controller, Post, Param, Body, UseGuards, HttpCode, HttpStatus, Headers, Req } from '@nestjs/common';
import { FoundationWorkflowService } from '../services/foundation.workflow.service';
import { GuidelineDocumentCreateDto } from '../dtos/guideline-document-create.dto';
import { GuidelineVersionCreateDto } from '../dtos/guideline-version-create.dto';
import { GuidelineAcceptDto } from '../dtos/guideline-accept.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * GuidelineController
 * Handles guideline document, version, and acceptance management.
 * Based on specs/foundation/foundation.pillar.v2.yml
 */
@Controller('/api/v1/foundation')
@UseGuards(AuthGuard, PermissionsGuard)
export class GuidelineController {
  constructor(private readonly workflowService: FoundationWorkflowService) {}

  /** POST /api/v1/foundation/guideline-documents */
  @Post('guideline-documents')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('foundation:admin')
  async createGuidelineDocument(
    @Body() dto: GuidelineDocumentCreateDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.createGuidelineDocument(dto, actor, idempotencyKey);
  }

  /** POST /api/v1/foundation/guideline-documents/:documentId/versions */
  @Post('guideline-documents/:documentId/versions')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('foundation:admin')
  async createGuidelineVersion(
    @Param('documentId') documentId: string,
    @Body() dto: GuidelineVersionCreateDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.createGuidelineVersion(Number(documentId), dto, actor, idempotencyKey);
  }

  /** POST /api/v1/foundation/guideline-versions/:versionId/publish */
  @Post('guideline-versions/:versionId/publish')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('foundation:admin')
  async publishGuidelineVersion(
    @Param('versionId') versionId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.publishGuidelineVersion(Number(versionId), actor, idempotencyKey);
  }

  /** POST /api/v1/foundation/guideline-versions/:versionId/archive */
  @Post('guideline-versions/:versionId/archive')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('foundation:admin')
  async archiveGuidelineVersion(
    @Param('versionId') versionId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.archiveGuidelineVersion(Number(versionId), actor, idempotencyKey);
  }

  /** POST /api/v1/foundation/guideline-versions/:versionId/accept */
  @Post('guideline-versions/:versionId/accept')
  @HttpCode(HttpStatus.CREATED)
  async acceptGuideline(
    @Param('versionId') versionId: string,
    @Body() dto: GuidelineAcceptDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @Headers('x-request-id') requestId: string,
    @Headers('x-forwarded-for') ip: string,
    @Headers('user-agent') userAgent: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    // version_id from path takes precedence
    dto.version_id = Number(versionId);
    return this.workflowService.acceptGuideline(dto, idempotencyKey, actor, requestId, ip, userAgent);
  }
}
