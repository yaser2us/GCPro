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
import { SpendIntentCreateDto } from '../dto/spend-intent-create.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * SpendIntentController
 * Handles spend intent lifecycle: create, complete, fail, cancel.
 * Based on specs/wallet-advanced/wallet-advanced.pillar.v2.yml
 */
@Controller('/api/v1/wallet-advanced')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('wallet-advanced:admin')
export class SpendIntentController {
  constructor(private readonly workflowService: WalletAdvancedWorkflowService) {}

  /** POST /api/v1/wallet-advanced/spend-intents */
  @Post('spend-intents')
  @HttpCode(HttpStatus.CREATED)
  async createSpendIntent(
    @Body() dto: SpendIntentCreateDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.createSpendIntent(dto, actor, idempotencyKey);
  }

  /** POST /api/v1/wallet-advanced/spend-intents/:spendIntentId/complete */
  @Post('spend-intents/:spendIntentId/complete')
  @HttpCode(HttpStatus.OK)
  async completeSpendIntent(
    @Param('spendIntentId') spendIntentId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.completeSpendIntent(Number(spendIntentId), actor, idempotencyKey);
  }

  /** POST /api/v1/wallet-advanced/spend-intents/:spendIntentId/fail */
  @Post('spend-intents/:spendIntentId/fail')
  @HttpCode(HttpStatus.OK)
  async failSpendIntent(
    @Param('spendIntentId') spendIntentId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.failSpendIntent(Number(spendIntentId), actor, idempotencyKey);
  }

  /** POST /api/v1/wallet-advanced/spend-intents/:spendIntentId/cancel */
  @Post('spend-intents/:spendIntentId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSpendIntent(
    @Param('spendIntentId') spendIntentId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.cancelSpendIntent(Number(spendIntentId), actor, idempotencyKey);
  }
}
