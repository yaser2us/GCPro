import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { NotificationWorkflowService } from '../services/notification.workflow.service';

/**
 * CrowdChargeNotificationHandler — Phase 7D (Notification plugin)
 *
 * Handles CROWD_MEMBER_CHARGED events and queues a push notification to the
 * insured member confirming their contribution charge.
 *
 * Template code: 'crowd_member_charged' (must be seeded in notification_template)
 * If template not found, skips gracefully with a warning log.
 *
 * Cross-plugin read: crowd_member_charge (insurant_id = account_id per crowd spec)
 *
 * Source: specs/crowd/crowd.pillar.v2.yml CROWD_MEMBER_CHARGED
 */
@Injectable()
export class CrowdChargeNotificationHandler {
  private readonly logger = new Logger(CrowdChargeNotificationHandler.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly notifService: NotificationWorkflowService,
  ) {}

  async handle(event: {
    charge_id: number;
    paid_amount?: string | number;
    remaining_amount?: string | number;
    [key: string]: any;
  }): Promise<void> {
    const chargeId = Number(event.charge_id);
    const templateCode = 'crowd_member_charged';

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();

    let accountId: number | null = null;
    let chargeAmount: number | null = null;
    let crowdPeriodId: number | null = null;

    try {
      // Load charge record — insurant_id IS account_id per crowd spec dependency
      const [chargeRow] = await qr.manager.query(
        `SELECT insurant_id, charge_amount, crowd_period_id
         FROM crowd_member_charge
         WHERE id = ?
         LIMIT 1`,
        [chargeId],
      );

      if (chargeRow) {
        accountId = Number(chargeRow.insurant_id);
        chargeAmount = Number(chargeRow.charge_amount);
        crowdPeriodId = Number(chargeRow.crowd_period_id);
      }
    } finally {
      await qr.release();
    }

    if (!accountId) {
      this.logger.warn(
        `CrowdChargeNotif: no account resolved for charge_id=${chargeId} — skipping`,
      );
      return;
    }

    const messageKey = `crowd_member_charged_${chargeId}`;
    const paidAmount = event.paid_amount != null ? Number(event.paid_amount) : chargeAmount;

    try {
      await this.notifService.sendNotificationMessage({
        message_key: messageKey,
        template_code: templateCode,
        channel: 'push',
        account_id: String(accountId),
        destination: null,
        payload_vars: {
          charge_id: chargeId,
          paid_amount: paidAmount,
          remaining_amount: event.remaining_amount != null ? Number(event.remaining_amount) : 0,
          crowd_period_id: crowdPeriodId,
        },
        trigger_event_id: String(chargeId),
        trigger_event_type: 'CROWD_MEMBER_CHARGED',
      } as any);

      this.logger.log(
        `CrowdChargeNotif: notification queued for account_id=${accountId}, charge_id=${chargeId}, paid=${paidAmount}`,
      );
    } catch (err) {
      // Template may not be seeded — degrade gracefully
      this.logger.warn(
        `CrowdChargeNotif: notification skipped for charge_id=${chargeId} — ${err.message}`,
      );
    }
  }
}
