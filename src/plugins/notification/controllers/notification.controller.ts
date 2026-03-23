import {
  Controller,
  Post,
  Put,
  Get,
  Param,
  Body,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationWorkflowService } from '../services/notification.workflow.service';
import { NotificationScheduleDispatcherService } from '../services/notification-schedule-dispatcher.service';
import { NotificationMessageSendRequestDto } from '../dto/notification-message-send.request.dto';
import { NotificationDeliveryRecordRequestDto } from '../dto/notification-delivery-record.request.dto';
import { NotificationTemplateCreateRequestDto } from '../dto/notification-template-create.request.dto';
import { NotificationScheduleCreateRequestDto } from '../dto/notification-schedule-create.request.dto';
import { NotificationPreferenceUpdateRequestDto } from '../dto/notification-preference-update.request.dto';
import { NotificationChannelPreferenceSetRequestDto } from '../dto/notification-channel-preference-set.request.dto';

/**
 * Notification Controller
 * Source: specs/notification/notification.pillar.v2.yml
 *
 * Implements all 18 notification endpoints
 */
@Controller('v1')
export class NotificationController {
  constructor(
    private readonly notificationWorkflow: NotificationWorkflowService,
    private readonly dispatcher: NotificationScheduleDispatcherService,
  ) {}

  /**
   * POST /v1/notifications/send
   * NotificationMessage.Send - Queue a notification message
   */
  @Post('notifications/send')
  async sendNotificationMessage(
    @Body() request: NotificationMessageSendRequestDto,
  ) {
    return this.notificationWorkflow.sendNotificationMessage(request);
  }

  /**
   * POST /v1/notifications/process-next
   * NotificationMessage.ProcessNext - Pick and process next queued message
   */
  @Post('notifications/process-next')
  async processNextMessage() {
    return this.notificationWorkflow.processNextMessage();
  }

  /**
   * POST /v1/notifications/:message_id/mark-sent
   * NotificationMessage.MarkSent - Mark message as sent
   */
  @Post('notifications/:message_id/mark-sent')
  async markMessageSent(@Param('message_id', ParseIntPipe) messageId: number) {
    await this.notificationWorkflow.markMessageSent(messageId);
    return { success: true };
  }

  /**
   * POST /v1/notifications/:message_id/mark-failed
   * NotificationMessage.MarkFailed - Mark message as failed
   */
  @Post('notifications/:message_id/mark-failed')
  async markMessageFailed(
    @Param('message_id', ParseIntPipe) messageId: number,
  ) {
    await this.notificationWorkflow.markMessageFailed(messageId);
    return { success: true };
  }

  /**
   * POST /v1/notifications/:message_id/retry
   * NotificationMessage.Retry - Retry failed message
   */
  @Post('notifications/:message_id/retry')
  async retryMessage(@Param('message_id', ParseIntPipe) messageId: number) {
    await this.notificationWorkflow.retryMessage(messageId);
    return { success: true };
  }

  /**
   * POST /v1/notifications/:message_id/cancel
   * NotificationMessage.Cancel - Cancel queued message
   */
  @Post('notifications/:message_id/cancel')
  async cancelMessage(@Param('message_id', ParseIntPipe) messageId: number) {
    await this.notificationWorkflow.cancelMessage(messageId);
    return { success: true };
  }

  /**
   * POST /v1/notifications/:message_id/attempts
   * NotificationDelivery.Record - Record delivery attempt result
   */
  @Post('notifications/:message_id/attempts')
  async recordDeliveryAttempt(
    @Param('message_id', ParseIntPipe) messageId: number,
    @Body() request: NotificationDeliveryRecordRequestDto,
  ) {
    return this.notificationWorkflow.recordDeliveryAttempt(messageId, request);
  }

  /**
   * POST /v1/notification-templates
   * NotificationTemplate.Create - Create notification template
   */
  @Post('notification-templates')
  async createNotificationTemplate(
    @Body() request: NotificationTemplateCreateRequestDto,
  ) {
    return this.notificationWorkflow.createNotificationTemplate(request);
  }

  /**
   * PUT /v1/notification-templates/:template_id
   * NotificationTemplate.Update - Update template (creates new version)
   */
  @Put('notification-templates/:template_id')
  async updateNotificationTemplate(
    @Param('template_id', ParseIntPipe) templateId: number,
    @Body() request: NotificationTemplateCreateRequestDto,
  ) {
    return this.notificationWorkflow.updateNotificationTemplate(
      templateId,
      request,
    );
  }

  /**
   * POST /v1/notification-templates/:template_id/deactivate
   * NotificationTemplate.Deactivate - Deactivate template
   */
  @Post('notification-templates/:template_id/deactivate')
  async deactivateTemplate(
    @Param('template_id', ParseIntPipe) templateId: number,
  ) {
    await this.notificationWorkflow.deactivateTemplate(templateId);
    return { success: true };
  }

  /**
   * POST /v1/notification-templates/:template_id/activate
   * NotificationTemplate.Activate - Activate template
   */
  @Post('notification-templates/:template_id/activate')
  async activateTemplate(
    @Param('template_id', ParseIntPipe) templateId: number,
  ) {
    await this.notificationWorkflow.activateTemplate(templateId);
    return { success: true };
  }

  /**
   * POST /v1/notifications/:message_id/schedules
   * NotificationSchedule.Create - Schedule notification
   */
  @Post('notifications/:message_id/schedules')
  async createNotificationSchedule(
    @Param('message_id', ParseIntPipe) messageId: number,
    @Body() request: NotificationScheduleCreateRequestDto,
  ) {
    return this.notificationWorkflow.createNotificationSchedule(
      messageId,
      request,
    );
  }

  /**
   * POST /v1/notification-schedules/:schedule_id/fire
   * NotificationSchedule.Fire - Execute scheduled notification
   */
  @Post('notification-schedules/:schedule_id/fire')
  async fireSchedule(@Param('schedule_id', ParseIntPipe) scheduleId: number) {
    await this.notificationWorkflow.fireSchedule(scheduleId);
    return { success: true };
  }

  /**
   * POST /v1/notification-schedules/:schedule_id/cancel
   * NotificationSchedule.Cancel - Cancel scheduled notification
   */
  @Post('notification-schedules/:schedule_id/cancel')
  async cancelSchedule(
    @Param('schedule_id', ParseIntPipe) scheduleId: number,
  ) {
    await this.notificationWorkflow.cancelSchedule(scheduleId);
    return { success: true };
  }

  /**
   * GET /v1/notification-preferences
   * NotificationPreference.Get - Get/create user preferences
   */
  @Get('notification-preferences')
  async getNotificationPreference(
    @Query('account_id', ParseIntPipe) accountId: number,
    @Query('person_id') personId?: string,
  ) {
    const personIdNum = personId ? parseInt(personId) : undefined;
    return this.notificationWorkflow.getNotificationPreference(
      accountId,
      personIdNum,
    );
  }

  /**
   * PUT /v1/notification-preferences/:preference_id
   * NotificationPreference.Update - Update preferences
   */
  @Put('notification-preferences/:preference_id')
  async updateNotificationPreference(
    @Param('preference_id', ParseIntPipe) preferenceId: number,
    @Body() request: NotificationPreferenceUpdateRequestDto,
  ) {
    await this.notificationWorkflow.updateNotificationPreference(
      preferenceId,
      request,
    );
    return { success: true };
  }

  /**
   * POST /v1/notifications/schedule/dispatch
   * NotificationSchedule.Dispatch — cron endpoint (every minute)
   * Processes all pending notification_schedule rows whose fire_at has passed.
   */
  @Post('notifications/schedule/dispatch')
  @HttpCode(HttpStatus.OK)
  async dispatchSchedules() {
    return this.dispatcher.dispatchDue();
  }

  /**
   * PUT /v1/notification-preferences/:preference_id/channels/:channel
   * NotificationChannelPreference.Set - Configure channel preference
   */
  @Put('notification-preferences/:preference_id/channels/:channel')
  async setChannelPreference(
    @Param('preference_id', ParseIntPipe) preferenceId: number,
    @Param('channel') channel: string,
    @Body() request: NotificationChannelPreferenceSetRequestDto,
  ) {
    // Override channel from URL
    request.channel = channel;
    await this.notificationWorkflow.setChannelPreference(preferenceId, request);
    return { success: true };
  }
}
