import { Injectable, Logger } from '@nestjs/common';
import { NotificationWorkflowService } from '../services/notification.workflow.service';

/**
 * UserLoggedInHandler — Phase 9D
 *
 * Handles USER_LOGGED_IN events from the identity plugin.
 * Sends an optional login alert notification to the user via their
 * preferred channel (configurable by template availability).
 *
 * Template code (must be seeded in notification_template):
 *   - 'login_alert'  — sent on every successful login
 *
 * Graceful skip if template not found or user_id is missing.
 * Fire-and-forget — login flow must not be blocked by notification failure.
 *
 * Source: specs/identity/identity.pillar.v2.yml — integration.notification
 */
@Injectable()
export class UserLoggedInHandler {
  private readonly logger = new Logger(UserLoggedInHandler.name);

  constructor(private readonly notifService: NotificationWorkflowService) {}

  async handle(event: {
    user_id?: number;
    platform?: string;
    channel_type?: string;
    [key: string]: any;
  }): Promise<void> {
    if (!event.user_id) {
      this.logger.log(
        `Phase 9D: USER_LOGGED_IN has no user_id — skipping login alert`,
      );
      return;
    }

    const messageKey = `login_alert_user_${event.user_id}_${Date.now()}`;

    try {
      await this.notifService.sendNotificationMessage({
        message_key: messageKey,
        template_code: 'login_alert',
        account_id: String(event.user_id),
        channel: event.channel_type ?? 'push',
        payload_vars: {
          user_id: event.user_id,
          platform: event.platform,
          channel_type: event.channel_type,
        },
        trigger_event_type: 'USER_LOGGED_IN',
        trigger_event_id: String(event.user_id),
      });

      this.logger.log(
        `Phase 9D: login alert queued for user_id=${event.user_id}, platform=${event.platform}`,
      );
    } catch (error) {
      if (error.message?.includes('Template not found')) {
        this.logger.warn(
          `Phase 9D: template 'login_alert' not found — skipping login alert for user_id=${event.user_id}`,
        );
        return;
      }
      throw error;
    }
  }
}
