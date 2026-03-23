import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { NotificationWorkflowService } from '../services/notification.workflow.service';

/**
 * ClaimEventNotificationHandler — Phase 5
 *
 * Handles CLAIM_* events and queues notification messages for the claimant.
 *
 * Template codes used (must be seeded in notification_template):
 *   - 'claim_submitted'
 *   - 'claim_approved'
 *   - 'claim_rejected'
 *   - 'claim_settled'
 *
 * Cross-plugin read: queries account/person via raw SQL to get destination.
 * If template not found, skips gracefully (logs warning — template is optional seed data).
 */
@Injectable()
export class ClaimEventNotificationHandler {
  private readonly logger = new Logger(ClaimEventNotificationHandler.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly notifService: NotificationWorkflowService,
  ) {}

  async handle(
    eventName: 'CLAIM_SUBMITTED' | 'CLAIM_APPROVED' | 'CLAIM_REJECTED' | 'CLAIM_SETTLED',
    event: {
      claim_id: number;
      claim_number?: string;
      account_id?: number;
      approved_amount?: number;
      [key: string]: any;
    },
  ): Promise<void> {
    const templateCodeMap: Record<string, string> = {
      CLAIM_SUBMITTED: 'claim_submitted',
      CLAIM_APPROVED: 'claim_approved',
      CLAIM_REJECTED: 'claim_rejected',
      CLAIM_SETTLED: 'claim_settled',
    };

    const templateCode = templateCodeMap[eventName];
    if (!templateCode) return;

    // Resolve account_id — use event field or fall back to raw SQL lookup
    let accountId = event.account_id ? Number(event.account_id) : null;
    if (!accountId && event.claim_id) {
      const qr = this.dataSource.createQueryRunner();
      await qr.connect();
      try {
        const [row] = await qr.manager.query(
          `SELECT cc.account_id FROM claim_case cc WHERE cc.id = ? LIMIT 1`,
          [event.claim_id],
        );
        accountId = row ? Number(row.account_id) : null;
      } finally {
        await qr.release();
      }
    }

    if (!accountId) {
      this.logger.warn(`${eventName}: no account_id resolved for claim_id=${event.claim_id} — skipping notification`);
      return;
    }

    const messageKey = `${templateCode}_${event.claim_id}`;

    try {
      await this.notifService.sendNotificationMessage({
        message_key: messageKey,
        template_code: templateCode,
        channel: 'push',
        account_id: String(accountId),
        destination: null,
        payload_vars: {
          claim_id: event.claim_id,
          claim_number: event.claim_number ?? '',
          approved_amount: event.approved_amount ?? null,
        },
        trigger_event_id: String(event.claim_id),
        trigger_event_type: eventName,
      } as any);
    } catch (err) {
      // Template may not be seeded — degrade gracefully
      this.logger.warn(
        `${eventName}: notification skipped for claim_id=${event.claim_id} — ${err.message}`,
      );
    }
  }
}
