import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
  Req,
} from '@nestjs/common';
import { PaymentWorkflowService } from '../services/payment.workflow.service';
import { WebhookReceiveDto } from '../dtos/webhook-receive.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';
import type { Request } from 'express';

/**
 * Webhook Controller
 * Handles HTTP endpoints for payment webhook operations
 *
 * Based on specs/payment/payment.pillar.v2.yml commands section
 */
@Controller('/api/v1/webhook')
@UseGuards(AuthGuard, PermissionsGuard)
export class WebhookController {
  constructor(private readonly workflowService: PaymentWorkflowService) {}

  /**
   * RECEIVE WEBHOOK ENDPOINT
   * Spec: specs/payment/payment.pillar.v2.yml lines 1401-1420
   */
  @Post(':provider')
  @HttpCode(HttpStatus.OK)
  async receiveWebhook(
    @Param('provider') provider: string,
    @Body() payloadJson: any,
    @Headers() headers: Record<string, string>,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
    @Req() req: Request,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    // Extract signature from headers (common webhook signature header names)
    const signature =
      headers['stripe-signature'] ||
      headers['x-signature'] ||
      headers['signature'] ||
      undefined;

    // Extract provider event ID (common event ID header names)
    const providerEventId =
      headers['stripe-event-id'] ||
      headers['x-event-id'] ||
      headers['event-id'] ||
      payloadJson?.id ||
      undefined;

    // Get client IP
    const receivedIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      'unknown';

    const request: WebhookReceiveDto = {
      provider,
      providerEventId,
      signature,
      headersJson: headers,
      payloadJson,
    };

    return this.workflowService.receiveWebhook(
      provider,
      request,
      receivedIp,
      actor,
      idempotencyKey,
    );
  }
}
