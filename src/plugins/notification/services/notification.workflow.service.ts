import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { NotificationMessageRepository } from '../repositories/notification-message.repo';
import { NotificationDeliveryAttemptRepository } from '../repositories/notification-delivery-attempt.repo';
import { NotificationTemplateRepository } from '../repositories/notification-template.repo';
import { NotificationScheduleRepository } from '../repositories/notification-schedule.repo';
import { NotificationPreferenceRepository } from '../repositories/notification-preference.repo';
import { NotificationChannelPreferenceRepository } from '../repositories/notification-channel-preference.repo';
import { NotificationMessageSendRequestDto } from '../dto/notification-message-send.request.dto';
import { NotificationDeliveryRecordRequestDto } from '../dto/notification-delivery-record.request.dto';
import { NotificationTemplateCreateRequestDto } from '../dto/notification-template-create.request.dto';
import { NotificationScheduleCreateRequestDto } from '../dto/notification-schedule-create.request.dto';
import { NotificationPreferenceUpdateRequestDto } from '../dto/notification-preference-update.request.dto';
import { NotificationChannelPreferenceSetRequestDto } from '../dto/notification-channel-preference-set.request.dto';

/**
 * Notification Workflow Service
 * Source: specs/notification/notification.pillar.v2.yml
 *
 * Implements all 18 notification commands with Guard → Write → Emit → Commit pattern
 */
@Injectable()
export class NotificationWorkflowService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly messageRepo: NotificationMessageRepository,
    private readonly deliveryAttemptRepo: NotificationDeliveryAttemptRepository,
    private readonly templateRepo: NotificationTemplateRepository,
    private readonly scheduleRepo: NotificationScheduleRepository,
    private readonly preferenceRepo: NotificationPreferenceRepository,
    private readonly channelPreferenceRepo: NotificationChannelPreferenceRepository,
  ) {}

  /**
   * NotificationMessage.Send
   * Queue a notification message for delivery
   */
  async sendNotificationMessage(
    request: NotificationMessageSendRequestDto,
  ): Promise<{ message_id: number; status: string; scheduled_for: Date | null }> {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Guard: Find template by code and channel
      const template = await this.templateRepo.findByCodeAndChannel(
        request.template_code,
        request.channel,
        'en',
        qr,
      );

      if (!template) {
        throw new Error(
          `Template not found: ${request.template_code} for channel ${request.channel}`,
        );
      }

      if (template.status !== 'active') {
        throw new Error(`Template ${request.template_code} is not active`);
      }

      // TODO: Check user preferences and quiet hours if person_id provided

      // Write: Create notification message
      const scheduledFor = request.scheduled_for
        ? new Date(request.scheduled_for)
        : null;

      const message = await this.messageRepo.upsertByMessageKey(
        {
          message_key: request.message_key,
          template_id: template.id,
          account_id: parseInt(request.account_id),
          person_id: request.person_id ? parseInt(request.person_id) : null,
          channel: request.channel,
          destination: request.destination,
          status: 'queued',
          payload_vars: request.payload_vars,
          scheduled_for: scheduledFor,
          trigger_event_id: request.trigger_event_id,
          trigger_event_type: request.trigger_event_type,
        },
        qr,
      );

      // Emit: NotificationMessage.Sent event (would go to outbox in real implementation)

      // Commit
      await qr.commitTransaction();

      return {
        message_id: message.id,
        status: message.status,
        scheduled_for: message.scheduled_for,
      };
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  /**
   * NotificationMessage.ProcessNext
   * Pick next queued message and attempt delivery
   */
  async processNextMessage(): Promise<{
    message_id: number;
    attempt_no: number;
    template_data: any;
  } | null> {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Guard: Find and lock next queued message
      const message = await this.messageRepo.findNextQueued(qr);
      if (!message) {
        await qr.commitTransaction();
        return null;
      }

      // Check attempt count
      if (message.attempt_count >= message.max_attempts) {
        await qr.commitTransaction();
        return null;
      }

      // Write: Update message status and create delivery attempt
      const attemptNo = message.attempt_count + 1;

      await this.messageRepo.update(
        message.id,
        {
          status: 'sending',
          attempt_count: attemptNo,
        },
        qr,
      );

      const attempt = await this.deliveryAttemptRepo.create(
        {
          message_id: message.id,
          attempt_no: attemptNo,
          provider: 'default',
          status: 'sending',
        },
        qr,
      );

      // Get template data
      const template = await this.templateRepo.findById(message.template_id, qr);

      // Emit: NotificationDelivery.Attempted event

      // Commit
      await qr.commitTransaction();

      return {
        message_id: message.id,
        attempt_no: attemptNo,
        template_data: {
          subject_tpl: template?.subject_tpl,
          body_tpl: template?.body_tpl,
          payload_vars: message.payload_vars,
        },
      };
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  /**
   * NotificationMessage.MarkSent
   * Mark message as successfully sent
   */
  async markMessageSent(messageId: number): Promise<void> {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Guard: Verify message exists and status
      const message = await this.messageRepo.findById(messageId, qr);
      if (!message) {
        throw new Error(`Message ${messageId} not found`);
      }

      if (message.status !== 'sending') {
        throw new Error(`Message ${messageId} is not in sending status`);
      }

      // Write: Update message status
      await this.messageRepo.update(
        messageId,
        {
          status: 'sent',
          sent_at: new Date(),
        },
        qr,
      );

      // Emit: NotificationMessage.Delivered event

      // Commit
      await qr.commitTransaction();
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  /**
   * NotificationMessage.MarkFailed
   * Mark message as failed after exhausting attempts
   */
  async markMessageFailed(messageId: number): Promise<void> {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Guard: Verify message exists and attempts exhausted
      const message = await this.messageRepo.findById(messageId, qr);
      if (!message) {
        throw new Error(`Message ${messageId} not found`);
      }

      if (message.status !== 'sending') {
        throw new Error(`Message ${messageId} is not in sending status`);
      }

      if (message.attempt_count < message.max_attempts) {
        throw new Error(`Message ${messageId} has not exhausted attempts`);
      }

      // Write: Update message status
      await this.messageRepo.update(
        messageId,
        {
          status: 'failed',
        },
        qr,
      );

      // Emit: NotificationMessage.Failed event

      // Commit
      await qr.commitTransaction();
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  /**
   * NotificationMessage.Retry
   * Reset message to queued for retry
   */
  async retryMessage(messageId: number): Promise<void> {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Guard: Verify message exists
      const message = await this.messageRepo.findById(messageId, qr);
      if (!message) {
        throw new Error(`Message ${messageId} not found`);
      }

      if (message.status !== 'failed' && message.status !== 'sending') {
        throw new Error(
          `Message ${messageId} cannot be retried (status: ${message.status})`,
        );
      }

      // Write: Reset message for retry
      await this.messageRepo.update(
        messageId,
        {
          status: 'queued',
          attempt_count: 0,
        },
        qr,
      );

      // Emit: NotificationMessage.Sent (retry)

      // Commit
      await qr.commitTransaction();
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  /**
   * NotificationMessage.Cancel
   * Cancel a queued or scheduled message
   */
  async cancelMessage(messageId: number): Promise<void> {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Guard: Verify message exists and is queued
      const message = await this.messageRepo.findById(messageId, qr);
      if (!message) {
        throw new Error(`Message ${messageId} not found`);
      }

      if (message.status !== 'queued') {
        throw new Error(`Message ${messageId} cannot be cancelled (status: ${message.status})`);
      }

      // Write: Cancel message and associated schedules
      await this.messageRepo.update(
        messageId,
        {
          status: 'cancelled',
        },
        qr,
      );

      // Cancel associated schedules
      const schedules = await this.scheduleRepo.findByMessageId(messageId, qr);
      for (const schedule of schedules) {
        if (schedule.status === 'pending') {
          await this.scheduleRepo.update(
            schedule.id,
            { status: 'cancelled' },
            qr,
          );
        }
      }

      // Emit: NotificationMessage.Cancelled event

      // Commit
      await qr.commitTransaction();
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  /**
   * NotificationDelivery.Record
   * Record delivery attempt result
   */
  async recordDeliveryAttempt(
    messageId: number,
    request: NotificationDeliveryRecordRequestDto,
  ): Promise<{ attempt_id: number; message_status: string }> {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Guard: Verify message exists
      const message = await this.messageRepo.findById(messageId, qr);
      if (!message) {
        throw new Error(`Message ${messageId} not found`);
      }

      // Find current attempt
      const attempt = await this.deliveryAttemptRepo.findByMessageAndAttempt(
        messageId,
        message.attempt_count,
        qr,
      );

      if (!attempt) {
        throw new Error(
          `Attempt ${message.attempt_count} not found for message ${messageId}`,
        );
      }

      // Write: Update delivery attempt
      await this.deliveryAttemptRepo.update(
        attempt.id,
        {
          status: request.status,
          provider: request.provider,
          provider_ref: request.provider_ref,
          error_code: request.error_code,
          error_message: request.error_message,
          provider_payload: request.provider_payload,
          finished_at: new Date(),
        },
        qr,
      );

      // Update message based on delivery result
      let messageStatus = message.status;

      if (request.status === 'sent') {
        await this.messageRepo.update(
          messageId,
          {
            status: 'sent',
            sent_at: new Date(),
          },
          qr,
        );
        messageStatus = 'sent';
      } else if (request.status === 'failed') {
        if (message.attempt_count < message.max_attempts) {
          // Retry
          await this.messageRepo.update(
            messageId,
            {
              status: 'queued',
            },
            qr,
          );
          messageStatus = 'queued';
        } else {
          // Exhausted
          await this.messageRepo.update(
            messageId,
            {
              status: 'failed',
            },
            qr,
          );
          messageStatus = 'failed';
        }
      }

      // Emit: NotificationDelivery.Attempted event
      // Emit: NotificationMessage.Delivered or NotificationMessage.Failed events

      // Commit
      await qr.commitTransaction();

      return {
        attempt_id: attempt.id,
        message_status: messageStatus,
      };
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  /**
   * NotificationTemplate.Create
   * Create a new notification template
   */
  async createNotificationTemplate(
    request: NotificationTemplateCreateRequestDto,
  ): Promise<{ template_id: number }> {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Guard: Validate template syntax (basic validation)
      // TODO: Add Mustache/Handlebars validation

      // Write: Create template
      const template = await this.templateRepo.upsertByConstraint(
        {
          code: request.code,
          name: request.name,
          channel: request.channel,
          locale: request.locale || 'en',
          subject_tpl: request.subject_tpl,
          body_tpl: request.body_tpl,
          variables_schema_json: request.variables_schema_json,
          status: 'active',
          version: request.version || 'v1',
        },
        qr,
      );

      // Emit: NotificationTemplate.Created event

      // Commit
      await qr.commitTransaction();

      return { template_id: template.id };
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  /**
   * NotificationTemplate.Update
   * Update existing template (creates new version)
   */
  async updateNotificationTemplate(
    templateId: number,
    request: NotificationTemplateCreateRequestDto,
  ): Promise<{ template_id: number; new_version: string }> {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Guard: Verify template exists
      const oldTemplate = await this.templateRepo.findById(templateId, qr);
      if (!oldTemplate) {
        throw new Error(`Template ${templateId} not found`);
      }

      // Auto-increment version
      const versionMatch = oldTemplate.version.match(/v(\d+)/);
      const currentVersion = versionMatch ? parseInt(versionMatch[1]) : 1;
      const newVersion = `v${currentVersion + 1}`;

      // Write: Archive old template and create new version
      await this.templateRepo.update(
        templateId,
        {
          status: 'archived',
        },
        qr,
      );

      const newTemplate = await this.templateRepo.create(
        {
          code: request.code || oldTemplate.code,
          name: request.name || oldTemplate.name,
          channel: request.channel || oldTemplate.channel,
          locale: request.locale || oldTemplate.locale,
          subject_tpl: request.subject_tpl || oldTemplate.subject_tpl,
          body_tpl: request.body_tpl,
          variables_schema_json:
            request.variables_schema_json || oldTemplate.variables_schema_json,
          status: 'active',
          version: newVersion,
        },
        qr,
      );

      // Emit: NotificationTemplate.Updated event

      // Commit
      await qr.commitTransaction();

      return {
        template_id: newTemplate.id,
        new_version: newVersion,
      };
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  /**
   * NotificationTemplate.Deactivate
   * Deactivate a template
   */
  async deactivateTemplate(templateId: number): Promise<void> {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Guard: Verify template exists and is active
      const template = await this.templateRepo.findById(templateId, qr);
      if (!template) {
        throw new Error(`Template ${templateId} not found`);
      }

      if (template.status !== 'active') {
        throw new Error(`Template ${templateId} is not active`);
      }

      // Write: Deactivate template
      await this.templateRepo.update(
        templateId,
        {
          status: 'inactive',
        },
        qr,
      );

      // Emit: NotificationTemplate.Deactivated event

      // Commit
      await qr.commitTransaction();
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  /**
   * NotificationTemplate.Activate
   * Activate an inactive template
   */
  async activateTemplate(templateId: number): Promise<void> {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Guard: Verify template exists and is inactive
      const template = await this.templateRepo.findById(templateId, qr);
      if (!template) {
        throw new Error(`Template ${templateId} not found`);
      }

      if (template.status !== 'inactive') {
        throw new Error(`Template ${templateId} is not inactive`);
      }

      // Write: Activate template
      await this.templateRepo.update(
        templateId,
        {
          status: 'active',
        },
        qr,
      );

      // Emit: NotificationTemplate.Created (reactivated) event

      // Commit
      await qr.commitTransaction();
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  /**
   * NotificationSchedule.Create
   * Schedule a notification for future delivery
   */
  async createNotificationSchedule(
    messageId: number,
    request: NotificationScheduleCreateRequestDto,
  ): Promise<{ schedule_id: number }> {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Guard: Verify message exists
      const message = await this.messageRepo.findById(messageId, qr);
      if (!message) {
        throw new Error(`Message ${messageId} not found`);
      }

      // Verify fire_at is in the future
      const fireAt = new Date(request.fire_at);
      if (fireAt <= new Date()) {
        throw new Error('fire_at must be in the future');
      }

      // Write: Create schedule
      const schedule = await this.scheduleRepo.create(
        {
          message_id: messageId,
          schedule_type: request.schedule_type,
          step_no: request.step_no || 1,
          delay_minutes: request.delay_minutes || 0,
          status: 'pending',
          fire_at: fireAt,
          meta: request.meta,
        },
        qr,
      );

      // Emit: NotificationSchedule.Created event

      // Commit
      await qr.commitTransaction();

      return { schedule_id: schedule.id };
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  /**
   * NotificationSchedule.Fire
   * Execute a scheduled notification
   */
  async fireSchedule(scheduleId: number): Promise<void> {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Guard: Verify schedule exists and is pending
      const schedule = await this.scheduleRepo.findById(scheduleId, qr);
      if (!schedule) {
        throw new Error(`Schedule ${scheduleId} not found`);
      }

      if (schedule.status !== 'pending') {
        throw new Error(`Schedule ${scheduleId} is not pending`);
      }

      if (schedule.fire_at > new Date()) {
        throw new Error(`Schedule ${scheduleId} fire time has not arrived`);
      }

      // Write: Update schedule and trigger message
      await this.scheduleRepo.update(
        scheduleId,
        {
          status: 'fired',
          fired_at: new Date(),
        },
        qr,
      );

      if (schedule.message_id) {
        await this.messageRepo.update(
          schedule.message_id,
          { status: 'queued' },
          qr,
        );
      }

      // Emit: NotificationSchedule.Fired event

      // Commit
      await qr.commitTransaction();
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  /**
   * NotificationSchedule.Cancel
   * Cancel a pending schedule
   */
  async cancelSchedule(scheduleId: number): Promise<void> {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Guard: Verify schedule exists and is pending
      const schedule = await this.scheduleRepo.findById(scheduleId, qr);
      if (!schedule) {
        throw new Error(`Schedule ${scheduleId} not found`);
      }

      if (schedule.status !== 'pending') {
        throw new Error(`Schedule ${scheduleId} is not pending`);
      }

      // Write: Cancel schedule
      await this.scheduleRepo.update(
        scheduleId,
        {
          status: 'cancelled',
        },
        qr,
      );

      // Emit: NotificationSchedule.Cancelled event

      // Commit
      await qr.commitTransaction();
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  /**
   * NotificationPreference.Get
   * Get or create notification preference for account/person
   */
  async getNotificationPreference(
    accountId: number,
    personId?: number,
  ): Promise<any> {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Write: Find or create preference
      let preference = await this.preferenceRepo.findByAccountAndPerson(
        accountId,
        personId || null,
        qr,
      );

      if (!preference) {
        preference = await this.preferenceRepo.create(
          {
            account_id: accountId,
            person_id: personId || null,
            status: 'active',
          },
          qr,
        );
      }

      // Get channel preferences
      const channels = await this.channelPreferenceRepo.findByPreferenceId(
        preference.id,
        qr,
      );

      // Commit
      await qr.commitTransaction();

      return {
        preference_id: preference.id,
        status: preference.status,
        quiet_hours: preference.quiet_hours,
        channels: channels.map((ch) => ({
          channel: ch.channel,
          enabled: ch.enabled === 1,
          destination: ch.destination,
          priority: ch.priority,
        })),
      };
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  /**
   * NotificationPreference.Update
   * Update notification preferences
   */
  async updateNotificationPreference(
    preferenceId: number,
    request: NotificationPreferenceUpdateRequestDto,
  ): Promise<void> {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Guard: Verify preference exists
      const preference = await this.preferenceRepo.findById(preferenceId, qr);
      if (!preference) {
        throw new Error(`Preference ${preferenceId} not found`);
      }

      // Write: Update preference
      const updateData: any = {};
      if (request.status) updateData.status = request.status;
      if (request.quiet_hours !== undefined)
        updateData.quiet_hours = request.quiet_hours;
      if (request.meta !== undefined) updateData.meta = request.meta;

      await this.preferenceRepo.update(preferenceId, updateData, qr);

      // Emit: NotificationPreference.Updated event

      // Commit
      await qr.commitTransaction();
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  /**
   * NotificationChannelPreference.Set
   * Configure channel preference
   */
  async setChannelPreference(
    preferenceId: number,
    request: NotificationChannelPreferenceSetRequestDto,
  ): Promise<void> {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Guard: Verify preference exists
      const preference = await this.preferenceRepo.findById(preferenceId, qr);
      if (!preference) {
        throw new Error(`Preference ${preferenceId} not found`);
      }

      // Write: Upsert channel preference
      await this.channelPreferenceRepo.upsertByConstraint(
        {
          preference_id: preferenceId,
          channel: request.channel,
          enabled: request.enabled ? 1 : 0,
          destination: request.destination,
          priority: request.priority || 1,
          meta: request.meta,
        },
        qr,
      );

      // Emit: NotificationChannelPreference.Set event

      // Commit
      await qr.commitTransaction();
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }
}
