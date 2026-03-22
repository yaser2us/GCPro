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
import { DepositIntentCreateDto } from '../dto/deposit-intent-create.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * DepositIntentController
 * Handles deposit intent lifecycle: create, complete, fail, cancel.
 * Based on specs/wallet-advanced/wallet-advanced.pillar.v2.yml
 */
@Controller('/api/v1/wallet-advanced')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('wallet-advanced:admin')
export class DepositIntentController {
  constructor(private readonly workflowService: WalletAdvancedWorkflowService) {}

  /** POST /api/v1/wallet-advanced/deposit-intents */
  @Post('deposit-intents')
  @HttpCode(HttpStatus.CREATED)
  async createDepositIntent(
    @Body() dto: DepositIntentCreateDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.createDepositIntent(dto, actor, idempotencyKey);
  }

  /** POST /api/v1/wallet-advanced/deposit-intents/:depositIntentId/complete */
  @Post('deposit-intents/:depositIntentId/complete')
  @HttpCode(HttpStatus.OK)
  async completeDepositIntent(
    @Param('depositIntentId') depositIntentId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.completeDepositIntent(Number(depositIntentId), actor, idempotencyKey);
  }

  /** POST /api/v1/wallet-advanced/deposit-intents/:depositIntentId/fail */
  @Post('deposit-intents/:depositIntentId/fail')
  @HttpCode(HttpStatus.OK)
  async failDepositIntent(
    @Param('depositIntentId') depositIntentId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.failDepositIntent(Number(depositIntentId), actor, idempotencyKey);
  }

  /** POST /api/v1/wallet-advanced/deposit-intents/:depositIntentId/cancel */
  @Post('deposit-intents/:depositIntentId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelDepositIntent(
    @Param('depositIntentId') depositIntentId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.cancelDepositIntent(Number(depositIntentId), actor, idempotencyKey);
  }
}
