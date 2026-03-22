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
import { PaymentIntentCreateDto } from '../dtos/payment-intent-create.dto';
import { PaymentIntentConfirmDto } from '../dtos/payment-intent-confirm.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * PaymentIntent Controller
 * Handles HTTP endpoints for payment intent operations
 *
 * Based on specs/payment/payment.pillar.v2.yml commands section
 */
@Controller('/api/v1/payment-intent')
@UseGuards(AuthGuard, PermissionsGuard)
export class PaymentIntentController {
  constructor(private readonly workflowService: PaymentWorkflowService) {}

  /**
   * CREATE PAYMENT INTENT ENDPOINT
   * Spec: specs/payment/payment.pillar.v2.yml lines 1182-1214
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPaymentIntent(
    @Body() request: PaymentIntentCreateDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.createPaymentIntent(
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * CONFIRM PAYMENT INTENT ENDPOINT
   * Spec: specs/payment/payment.pillar.v2.yml lines 1216-1256
   */
  @Post(':intentId/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmPaymentIntent(
    @Param('intentId') intentId: string,
    @Body() request: PaymentIntentConfirmDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.confirmPaymentIntent(
      Number(intentId),
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * MARK PAYMENT INTENT SUCCEEDED ENDPOINT
   * Spec: specs/payment/payment.pillar.v2.yml lines 1258-1286
   */
  @Post(':intentId/mark-succeeded')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('payment:admin')
  async markPaymentIntentSucceeded(
    @Param('intentId') intentId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.markPaymentIntentSucceeded(
      Number(intentId),
      actor,
      idempotencyKey,
    );
  }

  /**
   * MARK PAYMENT INTENT FAILED ENDPOINT
   * Spec: specs/payment/payment.pillar.v2.yml lines 1288-1317
   */
  @Post(':intentId/mark-failed')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('payment:admin')
  async markPaymentIntentFailed(
    @Param('intentId') intentId: string,
    @Body() request: { failureCode?: string; failureMessage?: string },
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.markPaymentIntentFailed(
      Number(intentId),
      request.failureCode || 'unknown',
      request.failureMessage || 'Payment failed',
      actor,
      idempotencyKey,
    );
  }

  /**
   * CANCEL PAYMENT INTENT ENDPOINT
   * Spec: specs/payment/payment.pillar.v2.yml lines 1319-1350
   */
  @Post(':intentId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelPaymentIntent(
    @Param('intentId') intentId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.cancelPaymentIntent(
      Number(intentId),
      actor,
      idempotencyKey,
    );
  }
}
