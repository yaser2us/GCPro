import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentMethod } from './entities/payment-method.entity';
import { PaymentIntent } from './entities/payment-intent.entity';
import { PaymentReceipt } from './entities/payment-receipt.entity';
import { PaymentAttempt } from './entities/payment-attempt.entity';
import { PaymentEvent } from './entities/payment-event.entity';
import { PaymentWebhookInbox } from './entities/payment-webhook-inbox.entity';
import { PaymentMethodRepository } from './repositories/payment-method.repo';
import { PaymentIntentRepository } from './repositories/payment-intent.repo';
import { PaymentReceiptRepository } from './repositories/payment-receipt.repo';
import { PaymentAttemptRepository } from './repositories/payment-attempt.repo';
import { PaymentEventRepository } from './repositories/payment-event.repo';
import { PaymentWebhookInboxRepository } from './repositories/payment-webhook-inbox.repo';
import { PaymentWorkflowService } from './services/payment.workflow.service';
import { PaymentMethodController } from './controllers/payment-method.controller';
import { PaymentIntentController } from './controllers/payment-intent.controller';
import { ReceiptController } from './controllers/receipt.controller';
import { WebhookController } from './controllers/webhook.controller';

/**
 * PaymentModule
 * Provides payment processing capabilities including payment methods, payment intents,
 * webhook processing, and receipt issuance
 * Based on specs/payment/payment.pillar.v2.yml
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentMethod,
      PaymentIntent,
      PaymentReceipt,
      PaymentAttempt,
      PaymentEvent,
      PaymentWebhookInbox,
    ]),
  ],
  providers: [
    PaymentMethodRepository,
    PaymentIntentRepository,
    PaymentReceiptRepository,
    PaymentAttemptRepository,
    PaymentEventRepository,
    PaymentWebhookInboxRepository,
    PaymentWorkflowService,
  ],
  controllers: [
    PaymentMethodController,
    PaymentIntentController,
    ReceiptController,
    WebhookController,
  ],
  exports: [PaymentWorkflowService],
})
export class PaymentModule {}
