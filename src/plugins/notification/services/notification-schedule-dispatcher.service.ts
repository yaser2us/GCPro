import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OutboxService } from '../../../corekit/services/outbox.service';
import { NotificationScheduleRepository } from '../repositories/notification-schedule.repo';
import { NotificationWorkflowService } from './notification.workflow.service';

/**
 * NotificationScheduleDispatcherService — Phase 5
 *
 * Processes pending notification_schedule rows whose fire_at has passed.
 *
 * Two modes:
 *  1. message_id set → trigger notification send / retry
 *  2. ref_type + ref_id set → dispatch by schedule_type:
 *     - 'grace_expiry'  → emits GRACE_EXPIRY_DUE event (policy plugin expires the case)
 *
 * Called by: POST /api/v1/notification/schedule/dispatch (cron, every minute)
 *
 * Idempotency: marks each schedule 'fired' before dispatching to avoid double-fire.
 */
@Injectable()
export class NotificationScheduleDispatcherService {
  private readonly logger = new Logger(NotificationScheduleDispatcherService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly scheduleRepo: NotificationScheduleRepository,
    private readonly notifService: NotificationWorkflowService,
    private readonly outboxService: OutboxService,
  ) {}

  /**
   * Dispatch all pending schedules whose fire_at <= NOW().
   * Returns count of processed schedules.
   */
  async dispatchDue(): Promise<{ processed: number; failed: number }> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    let pending: any[] = [];
    try {
      pending = await this.scheduleRepo.findPendingReady(qr);
      await qr.commitTransaction();
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }

    let processed = 0;
    let failed = 0;

    for (const schedule of pending) {
      try {
        await this.dispatchOne(schedule);
        processed++;
      } catch (err) {
        this.logger.error(
          `Dispatch failed for schedule_id=${schedule.id}: ${err.message}`,
          err.stack,
        );
        failed++;
      }
    }

    this.logger.log(`Dispatch run: processed=${processed}, failed=${failed}`);
    return { processed, failed };
  }

  private async dispatchOne(schedule: any): Promise<void> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Mark fired first (idempotency)
      await this.scheduleRepo.update(schedule.id, { status: 'fired', fired_at: new Date() }, qr);

      if (schedule.message_id) {
        // Mode 1: trigger pending notification message send
        await this.triggerMessageSend(schedule.message_id, qr);
      } else if (schedule.ref_type && schedule.ref_id) {
        // Mode 2: ref-based dispatch
        await this.dispatchRefBased(schedule, qr);
      }

      await qr.commitTransaction();
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  private async triggerMessageSend(messageId: number, qr: any): Promise<void> {
    // Update message status to 'queued' so the send loop picks it up
    await qr.manager.query(
      `UPDATE notification_message SET status = 'queued', updated_at = NOW() WHERE id = ? AND status IN ('scheduled','pending')`,
      [messageId],
    );
    this.logger.log(`Schedule fired: message_id=${messageId} re-queued`);
  }

  private async dispatchRefBased(schedule: any, qr: any): Promise<void> {
    const payload = schedule.payload_json ?? {};

    switch (schedule.schedule_type) {
      case 'grace_expiry':
        // Emit GRACE_EXPIRY_DUE — the policy plugin's grace-expiry consumer handles this
        await this.outboxService.enqueue(
          {
            event_name: 'GRACE_EXPIRY_DUE',
            event_version: 1,
            aggregate_type: 'POLICY_REMEDIATION_CASE',
            aggregate_id: String(schedule.ref_id),
            actor_user_id: '0',
            occurred_at: new Date(),
            correlation_id: `grace_expiry_${schedule.ref_id}`,
            causation_id: `schedule_${schedule.id}`,
            payload: {
              remediation_case_id: schedule.ref_id,
              policy_id: payload.policy_id ?? null,
              reason_code: payload.reason_code ?? null,
              schedule_id: schedule.id,
            },
          },
          qr,
        );
        this.logger.log(
          `grace_expiry fired: case_id=${schedule.ref_id}, policy_id=${payload.policy_id}`,
        );
        break;

      default:
        this.logger.warn(
          `Unknown schedule_type='${schedule.schedule_type}' for schedule_id=${schedule.id} — skipped`,
        );
    }
  }
}
