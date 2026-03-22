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
import { WalletBatchCreateDto } from '../dto/wallet-batch-create.dto';
import { WalletBatchItemAddDto } from '../dto/wallet-batch-item-add.dto';
import { BatchItemFailDto } from '../dto/batch-item-fail.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * WalletBatchController
 * Handles wallet batch lifecycle: create, add items, process, complete/fail items, finalize.
 * Based on specs/wallet-advanced/wallet-advanced.pillar.v2.yml
 */
@Controller('/api/v1/wallet-advanced')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('wallet-advanced:admin')
export class WalletBatchController {
  constructor(private readonly workflowService: WalletAdvancedWorkflowService) {}

  /** POST /api/v1/wallet-advanced/batches */
  @Post('batches')
  @HttpCode(HttpStatus.CREATED)
  async createBatch(
    @Body() dto: WalletBatchCreateDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.createBatch(dto, actor, idempotencyKey);
  }

  /** POST /api/v1/wallet-advanced/batches/:batchId/items */
  @Post('batches/:batchId/items')
  @HttpCode(HttpStatus.CREATED)
  async addBatchItem(
    @Param('batchId') batchId: string,
    @Body() dto: WalletBatchItemAddDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.addBatchItem(Number(batchId), dto, actor, idempotencyKey);
  }

  /** POST /api/v1/wallet-advanced/batches/:batchId/process */
  @Post('batches/:batchId/process')
  @HttpCode(HttpStatus.OK)
  async processBatch(
    @Param('batchId') batchId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.processBatch(Number(batchId), actor, idempotencyKey);
  }

  /** POST /api/v1/wallet-advanced/batches/:batchId/items/:batchItemId/complete */
  @Post('batches/:batchId/items/:batchItemId/complete')
  @HttpCode(HttpStatus.OK)
  async completeBatchItem(
    @Param('batchId') batchId: string,
    @Param('batchItemId') batchItemId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.completeBatchItem(Number(batchId), Number(batchItemId), actor, idempotencyKey);
  }

  /** POST /api/v1/wallet-advanced/batches/:batchId/items/:batchItemId/fail */
  @Post('batches/:batchId/items/:batchItemId/fail')
  @HttpCode(HttpStatus.OK)
  async failBatchItem(
    @Param('batchId') batchId: string,
    @Param('batchItemId') batchItemId: string,
    @Body() dto: BatchItemFailDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.failBatchItem(Number(batchId), Number(batchItemId), dto, actor, idempotencyKey);
  }

  /** POST /api/v1/wallet-advanced/batches/:batchId/finalize */
  @Post('batches/:batchId/finalize')
  @HttpCode(HttpStatus.OK)
  async finalizeBatch(
    @Param('batchId') batchId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.finalizeBatch(Number(batchId), actor, idempotencyKey);
  }
}
