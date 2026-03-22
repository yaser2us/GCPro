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
import { PaymentWorkflowService } from '../services/payment.workflow.service';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * Receipt Controller
 * Handles HTTP endpoints for payment receipt operations
 *
 * Based on specs/payment/payment.pillar.v2.yml commands section
 */
@Controller('/api/v1/receipt')
@UseGuards(AuthGuard, PermissionsGuard)
export class ReceiptController {
  constructor(private readonly workflowService: PaymentWorkflowService) {}

  /**
   * ISSUE RECEIPT ENDPOINT
   * Spec: specs/payment/payment.pillar.v2.yml lines 1352-1377
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('payment:admin')
  async issueReceipt(
    @Body() request: { intentId: number },
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.issueReceipt(
      request.intentId,
      actor,
      idempotencyKey,
    );
  }

  /**
   * VOID RECEIPT ENDPOINT
   * Spec: specs/payment/payment.pillar.v2.yml lines 1379-1399
   */
  @Post(':receiptId/void')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('payment:admin')
  async voidReceipt(
    @Param('receiptId') receiptId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.voidReceipt(
      Number(receiptId),
      actor,
      idempotencyKey,
    );
  }
}
