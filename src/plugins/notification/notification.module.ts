import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationMessage } from './entities/notification-message.entity';
import { NotificationDeliveryAttempt } from './entities/notification-delivery-attempt.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { NotificationSchedule } from './entities/notification-schedule.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { NotificationChannelPreference } from './entities/notification-channel-preference.entity';
import { NotificationMessageRepository } from './repositories/notification-message.repo';
import { NotificationDeliveryAttemptRepository } from './repositories/notification-delivery-attempt.repo';
import { NotificationTemplateRepository } from './repositories/notification-template.repo';
import { NotificationScheduleRepository } from './repositories/notification-schedule.repo';
import { NotificationPreferenceRepository } from './repositories/notification-preference.repo';
import { NotificationChannelPreferenceRepository } from './repositories/notification-channel-preference.repo';
import { NotificationWorkflowService } from './services/notification.workflow.service';
import { NotificationScheduleDispatcherService } from './services/notification-schedule-dispatcher.service';
import { ClaimEventNotificationHandler } from './handlers/claim-event-notification.handler';
import { ClaimEventNotificationConsumer } from './consumers/claim-event-notification.consumer';
import { CrowdChargeNotificationHandler } from './handlers/crowd-charge-notification.handler';
import { CrowdChargeNotificationConsumer } from './consumers/crowd-charge-notification.consumer';
import { PaymentNotificationHandler } from './handlers/payment-notification.handler';
import { PaymentNotificationConsumer } from './consumers/payment-notification.consumer';
import { NotificationController } from './controllers/notification.controller';

/**
 * Notification Module
 * Source: specs/notification/notification.pillar.v2.yml
 *
 * Provides multi-channel notification system with:
 * - 6 entities (notification_message, notification_delivery_attempt, etc.)
 * - 6 repositories
 * - 18 commands (NotificationMessage.Send, NotificationTemplate.Create, etc.)
 * - 18 endpoints
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationMessage,
      NotificationDeliveryAttempt,
      NotificationTemplate,
      NotificationSchedule,
      NotificationPreference,
      NotificationChannelPreference,
    ]),
  ],
  providers: [
    NotificationMessageRepository,
    NotificationDeliveryAttemptRepository,
    NotificationTemplateRepository,
    NotificationScheduleRepository,
    NotificationPreferenceRepository,
    NotificationChannelPreferenceRepository,
    NotificationWorkflowService,
    NotificationScheduleDispatcherService,  // Phase 5: schedule dispatcher
    ClaimEventNotificationHandler,           // Phase 5: claim event → notification
    ClaimEventNotificationConsumer,          // Phase 5
    CrowdChargeNotificationHandler,          // Phase 7D: crowd charge → notification
    CrowdChargeNotificationConsumer,         // Phase 7D
    PaymentNotificationHandler,              // Phase 8C: payment outcome → notification
    PaymentNotificationConsumer,             // Phase 8C
  ],
  controllers: [NotificationController],
  exports: [NotificationWorkflowService, NotificationScheduleDispatcherService],
})
export class NotificationModule {}
