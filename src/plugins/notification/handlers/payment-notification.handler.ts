import { Injectable, Logger } from '@nestjs/common';
import { NotificationWorkflowService } from '../services/notification.workflow.service';

/**
 * PaymentNotificationHandler — Phase 8C
 *
 * Handles PAYMENT_SUCCEEDED and PAYMENT_FAILED events and queues
 * a notification (push/email) to the account holder confirming the outcome.
 *
 * Template codes (must be seeded in notification_template):
 *   - 'payment_succeeded'  — used on PAYMENT_SUCCEEDED
 *   - 'payment_failed'     — used on PAYMENT_FAILED
 *
 * account_id comes directly from the event payload — no cross-plugin read needed.
 * If template not found, skips gracefully (template is optional seed data).
 *
 * Source: specs/payment/payment.pillar.v2.yml — integration.notification
 */
@Injectable()
export class PaymentNotificationHandler {
  private readonly logger = new Logger(PaymentNotificationHandler.name);

  constructor(private readonly notifService: NotificationWorkflowService) {}

  async handle(
    eventName: 'PAYMENT_SUCCEEDED' | 'PAYMENT_FAILED',
    event: {
      intent_id: number;
      intent_key?: string;
      amount: number;
      currency: string;
      purpose_code?: string;
      ref_type?: string;
      ref_id?: string;
      account_id?: number;
      [key: string]: any;
    },
  ): Promise<void> {
    if (!event.account_id) {
      this.logger.log(
        `Phase 8C: ${eventName} has no account_id — intent_id=${event.intent_id}, skipping notification`,
      );
      return;
    }

    const templateCode =
      eventName === 'PAYMENT_SUCCEEDED' ? 'payment_succeeded' : 'payment_failed';

    const messageKey = `${templateCode}_intent_${event.intent_id}`;

    const payloadVars: Record<string, any> = {
      intent_id: event.intent_id,
      amount: event.amount,
      currency: event.currency,
    };

    if (event.purpose_code) payloadVars.purpose_code = event.purpose_code;
    if (event.ref_type)     payloadVars.ref_type = event.ref_type;
    if (event.ref_id)       payloadVars.ref_id = event.ref_id;

    try {
      await this.notifService.sendNotificationMessage({
        message_key: messageKey,
        template_code: templateCode,
        account_id: String(event.account_id),
        channel: 'push',
        payload_vars: payloadVars,
        trigger_event_type: eventName,
        trigger_event_id: String(event.intent_id),
      });

      this.logger.log(
        `Phase 8C: queued ${templateCode} notification — intent_id=${event.intent_id}, account_id=${event.account_id}`,
      );
    } catch (error) {
      // Gracefully skip if template not found — it's optional seed data
      if (error.message?.includes('Template not found')) {
        this.logger.warn(
          `Phase 8C: template '${templateCode}' not found — skipping notification for intent_id=${event.intent_id}`,
        );
        return;
      }
      throw error;
    }
  }
}
