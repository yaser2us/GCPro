import { Injectable, Logger } from '@nestjs/common';
import { NotificationWorkflowService } from '../services/notification.workflow.service';

/**
 * RegistrationTokenIssuedHandler — Phase 9C
 *
 * Handles REGISTRATION_TOKEN_ISSUED events from the identity plugin.
 * Delivers the OTP or magic-link to the user via the specified channel
 * (sms, email, whatsapp, push).
 *
 * Template codes (must be seeded in notification_template):
 *   - 'otp_delivery'   — used for all OTP/token delivery (channel-specific variants via channel field)
 *
 * OTP flow: event payload includes otp_plain (server-generated only).
 * Magic-link flow: event payload includes token (caller-provided).
 * Graceful skip if template not found or no deliverable content.
 *
 * Source: specs/identity/identity.pillar.v2.yml — integration.notification
 */
@Injectable()
export class RegistrationTokenIssuedHandler {
  private readonly logger = new Logger(RegistrationTokenIssuedHandler.name);

  async handle(event: {
    registration_token_id?: number;
    purpose: string;
    channel_type: string;
    channel_value: string;
    expires_at: string | Date;
    otp_plain?: string;
    token?: string;
    [key: string]: any;
  }): Promise<void> {
    const deliverable = event.otp_plain ?? event.token;

    if (!deliverable) {
      this.logger.log(
        `Phase 9C: REGISTRATION_TOKEN_ISSUED has no otp_plain or token — ` +
        `registration_token_id=${event.registration_token_id}, purpose=${event.purpose} — skipping`,
      );
      return;
    }

    const messageKey = `otp_delivery_token_${event.registration_token_id ?? event.channel_value}_${Date.now()}`;

    const payloadVars: Record<string, any> = {
      otp: deliverable,
      purpose: event.purpose,
      channel_value: event.channel_value,
      expires_at: event.expires_at,
    };

    try {
      await this.notifService.sendNotificationMessage({
        message_key: messageKey,
        template_code: 'otp_delivery',
        account_id: '0',                   // system-level send — no account yet at registration
        channel: event.channel_type,
        destination: event.channel_value,  // explicit destination (phone/email)
        payload_vars: payloadVars,
        trigger_event_type: 'REGISTRATION_TOKEN_ISSUED',
        trigger_event_id: String(event.registration_token_id ?? ''),
      });

      this.logger.log(
        `Phase 9C: OTP notification queued — channel=${event.channel_type}, ` +
        `destination=${event.channel_value}, purpose=${event.purpose}`,
      );
    } catch (error) {
      if (error.message?.includes('Template not found')) {
        this.logger.warn(
          `Phase 9C: template 'otp_delivery' not found — skipping OTP notification ` +
          `for registration_token_id=${event.registration_token_id}`,
        );
        return;
      }
      throw error;
    }
  }

  constructor(private readonly notifService: NotificationWorkflowService) {}
}
