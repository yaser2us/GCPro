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
import { WalletAdvancedWorkflowService } from '../services/wallet-advanced.workflow.service';
import { WalletHoldCreateDto } from '../dto/wallet-hold-create.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * WalletHoldController
 * Handles wallet hold lifecycle: place, release, capture, expire.
 * Based on specs/wallet-advanced/wallet-advanced.pillar.v2.yml
 */
@Controller('/api/v1/wallet-advanced')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('wallet-advanced:admin')
export class WalletHoldController {
  constructor(private readonly workflowService: WalletAdvancedWorkflowService) {}

  /** POST /api/v1/wallet-advanced/holds */
  @Post('holds')
  @HttpCode(HttpStatus.CREATED)
  async placeHold(
    @Body() dto: WalletHoldCreateDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.placeHold(dto, actor, idempotencyKey);
  }

  /** POST /api/v1/wallet-advanced/holds/:holdId/release */
  @Post('holds/:holdId/release')
  @HttpCode(HttpStatus.OK)
  async releaseHold(
    @Param('holdId') holdId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.releaseHold(Number(holdId), actor, idempotencyKey);
  }

  /** POST /api/v1/wallet-advanced/holds/:holdId/capture */
  @Post('holds/:holdId/capture')
  @HttpCode(HttpStatus.OK)
  async captureHold(
    @Param('holdId') holdId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.captureHold(Number(holdId), actor, idempotencyKey);
  }

  /** POST /api/v1/wallet-advanced/holds/:holdId/expire */
  @Post('holds/:holdId/expire')
  @HttpCode(HttpStatus.OK)
  async expireHold(
    @Param('holdId') holdId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.expireHold(Number(holdId), actor, idempotencyKey);
  }
}
