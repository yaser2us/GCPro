/**
 * Notification Plugin Barrel Export
 * Source: specs/notification/notification.pillar.v2.yml
 */

// Module
export { NotificationModule } from './notification.module';

// Entities
export { NotificationMessage } from './entities/notification-message.entity';
export { NotificationDeliveryAttempt } from './entities/notification-delivery-attempt.entity';
export { NotificationTemplate } from './entities/notification-template.entity';
export { NotificationSchedule } from './entities/notification-schedule.entity';
export { NotificationPreference } from './entities/notification-preference.entity';
export { NotificationChannelPreference } from './entities/notification-channel-preference.entity';

// DTOs
export { NotificationMessageSendRequestDto } from './dto/notification-message-send.request.dto';
export { NotificationDeliveryRecordRequestDto } from './dto/notification-delivery-record.request.dto';
export { NotificationTemplateCreateRequestDto } from './dto/notification-template-create.request.dto';
export { NotificationScheduleCreateRequestDto } from './dto/notification-schedule-create.request.dto';
export { NotificationPreferenceUpdateRequestDto } from './dto/notification-preference-update.request.dto';
export { NotificationChannelPreferenceSetRequestDto } from './dto/notification-channel-preference-set.request.dto';

// Services
export { NotificationWorkflowService } from './services/notification.workflow.service';

// Repositories
export { NotificationMessageRepository } from './repositories/notification-message.repo';
export { NotificationDeliveryAttemptRepository } from './repositories/notification-delivery-attempt.repo';
export { NotificationTemplateRepository } from './repositories/notification-template.repo';
export { NotificationScheduleRepository } from './repositories/notification-schedule.repo';
export { NotificationPreferenceRepository } from './repositories/notification-preference.repo';
export { NotificationChannelPreferenceRepository } from './repositories/notification-channel-preference.repo';
