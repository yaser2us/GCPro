import {
  Controller,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { PaymentWorkflowService } from '../services/payment.workflow.service';
import { PaymentMethodCreateDto } from '../dtos/payment-method-create.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * PaymentMethod Controller
 * Handles HTTP endpoints for payment method operations
 *
 * Based on specs/payment/payment.pillar.v2.yml commands section
 */
@Controller('/api/v1/payment-method')
@UseGuards(AuthGuard, PermissionsGuard)
export class PaymentMethodController {
  constructor(private readonly workflowService: PaymentWorkflowService) {}

  /**
   * CREATE PAYMENT METHOD ENDPOINT
   * Spec: specs/payment/payment.pillar.v2.yml lines 1137-1159
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPaymentMethod(
    @Body() request: PaymentMethodCreateDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.createPaymentMethod(
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * DELETE PAYMENT METHOD ENDPOINT
   * Spec: specs/payment/payment.pillar.v2.yml lines 1161-1180
   */
  @Delete(':paymentMethodId')
  @HttpCode(HttpStatus.OK)
  async deletePaymentMethod(
    @Param('paymentMethodId') paymentMethodId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.deletePaymentMethod(
      Number(paymentMethodId),
      actor,
      idempotencyKey,
    );
  }
}
