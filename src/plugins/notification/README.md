## Notification Plugin

**Source:** `specs/notification/notification.pillar.v2.yml`

Provides a comprehensive multi-channel notification system for the GCPro platform, including message queuing, delivery tracking, templates with versioning, scheduling, and user preferences.

## Overview

The Notification plugin manages the complete lifecycle of notifications across multiple channels (email, SMS, push, etc.) with support for:

- **Message Lifecycle**: queued → sending → sent/failed
- **Multi-Channel Support**: Email, SMS, push notifications, in-app, etc.
- **Delivery Retry**: Automatic retry with configurable max attempts
- **Template Management**: Reusable templates with versioning
- **Scheduling**: Future delivery and recurring notifications
- **User Preferences**: Quiet hours, channel preferences, opt-out
- **Delivery Tracking**: Complete audit trail of all delivery attempts

## Data Model

### Entities (6 Tables)

1. **notification_message** - Main message records
   - Lifecycle states: queued, sending, sent, failed, cancelled
   - Template-based rendering with variable substitution
   - Scheduled delivery support
   - Retry mechanism with max_attempts

2. **notification_delivery_attempt** - Delivery attempt tracking
   - Records each delivery attempt
   - Provider-specific responses
   - Error tracking (error_code, error_message)
   - Performance metrics (started_at, finished_at)

3. **notification_template** - Message templates
   - Multi-channel support (email, sms, push, etc.)
   - Multi-locale support (en, es, fr, etc.)
   - Version control (v1, v2, etc.)
   - Variable schema for validation
   - Status management (active, inactive, archived)

4. **notification_schedule** - Scheduled notifications
   - One-time and recurring schedules
   - Step-based workflows (step_no, delay_minutes)
   - Fire time tracking
   - Cancellation support

5. **notification_preference** - User preferences
   - Account-level or person-level
   - Quiet hours configuration
   - Global opt-in/opt-out
   - Custom metadata

6. **notification_channel_preference** - Channel-specific settings
   - Enable/disable per channel
   - Custom destinations per channel
   - Priority ordering
   - Channel-specific metadata

## Commands (18)

### Message Lifecycle Management (6 commands)

1. **NotificationMessage.Send** - Queue notification for delivery
   - Validates template exists and is active
   - Checks user preferences and quiet hours
   - Supports immediate or scheduled delivery
   - Idempotent via UNIQUE(message_key)

2. **NotificationMessage.ProcessNext** - Pick next queued message
   - Pessimistic locking for concurrency
   - Respects scheduled_for timestamp
   - Increments attempt_count
   - Creates delivery attempt record

3. **NotificationMessage.MarkSent** - Mark as successfully delivered
   - Sets status='sent' and sent_at timestamp
   - Only valid from status='sending'
   - Triggers delivery success events

4. **NotificationMessage.MarkFailed** - Mark as permanently failed
   - Verifies all retry attempts exhausted
   - Sets status='failed'
   - Triggers delivery failure events

5. **NotificationMessage.Retry** - Reset for manual retry
   - Resets attempt_count to 0
   - Changes status back to 'queued'
   - Allows manual intervention on failures

6. **NotificationMessage.Cancel** - Cancel queued message
   - Only works on status='queued'
   - Cascades to associated schedules
   - Prevents delivery

### Delivery Tracking (1 command)

7. **NotificationDelivery.Record** - Record attempt result
   - Updates delivery attempt with provider response
   - Auto-transitions message status based on result
   - Triggers retry if attempts remaining
   - Marks failed if attempts exhausted

### Template Management (4 commands)

8. **NotificationTemplate.Create** - Create new template
   - Validates template syntax
   - Idempotent via UNIQUE(code, version, locale, channel)
   - Supports variable schema for validation

9. **NotificationTemplate.Update** - Create new version
   - Auto-increments version number
   - Archives old version (status='archived')
   - Preserves template history

10. **NotificationTemplate.Deactivate** - Disable template
    - Sets status='inactive'
    - Prevents new message creation
    - Existing messages unaffected

11. **NotificationTemplate.Activate** - Enable template
    - Sets status='active'
    - Allows new message creation

### Scheduling (3 commands)

12. **NotificationSchedule.Create** - Schedule future notification
    - Validates fire_at is in future
    - Supports step-based workflows
    - Links to message record

13. **NotificationSchedule.Fire** - Execute scheduled notification
    - Verifies fire time has arrived
    - Transitions message to 'queued'
    - Marks schedule as 'fired'

14. **NotificationSchedule.Cancel** - Cancel pending schedule
    - Only works on status='pending'
    - Prevents future execution

### User Preferences (4 commands)

15. **NotificationPreference.Get** - Get/create preferences
    - Auto-creates default preferences if not found
    - Returns preference with channel settings
    - Read-only operation (creates if missing)

16. **NotificationPreference.Update** - Update preferences
    - Configures quiet hours
    - Sets global status (active/inactive)
    - Custom metadata support

17. **NotificationChannelPreference.Set** - Configure channel
    - Enable/disable specific channel
    - Set custom destination per channel
    - Configure priority ordering
    - Idempotent via UNIQUE(preference_id, channel)

## HTTP Endpoints (18)

### Message Lifecycle

```
POST   /v1/notifications/send                  NotificationMessage.Send
POST   /v1/notifications/process-next          NotificationMessage.ProcessNext
POST   /v1/notifications/:message_id/mark-sent NotificationMessage.MarkSent
POST   /v1/notifications/:message_id/mark-failed NotificationMessage.MarkFailed
POST   /v1/notifications/:message_id/retry     NotificationMessage.Retry
POST   /v1/notifications/:message_id/cancel    NotificationMessage.Cancel
```

### Delivery Tracking

```
POST   /v1/notifications/:message_id/attempts  NotificationDelivery.Record
```

### Template Management

```
POST   /v1/notification-templates              NotificationTemplate.Create
PUT    /v1/notification-templates/:template_id NotificationTemplate.Update
POST   /v1/notification-templates/:template_id/deactivate NotificationTemplate.Deactivate
POST   /v1/notification-templates/:template_id/activate NotificationTemplate.Activate
```

### Scheduling

```
POST   /v1/notifications/:message_id/schedules NotificationSchedule.Create
POST   /v1/notification-schedules/:schedule_id/fire NotificationSchedule.Fire
POST   /v1/notification-schedules/:schedule_id/cancel NotificationSchedule.Cancel
```

### User Preferences

```
GET    /v1/notification-preferences            NotificationPreference.Get
PUT    /v1/notification-preferences/:preference_id NotificationPreference.Update
PUT    /v1/notification-preferences/:preference_id/channels/:channel NotificationChannelPreference.Set
```

## Events (13)

All events follow outbox pattern for reliable event publishing:

```
NotificationMessage.Sent        - Message queued for delivery
NotificationMessage.Delivered   - Successfully delivered
NotificationMessage.Failed      - All attempts exhausted
NotificationMessage.Cancelled   - Message cancelled
NotificationDelivery.Attempted  - Delivery attempt recorded
NotificationTemplate.Created    - Template created or reactivated
NotificationTemplate.Updated    - New template version created
NotificationTemplate.Deactivated - Template disabled
NotificationSchedule.Created    - Schedule created
NotificationSchedule.Fired      - Schedule executed
NotificationSchedule.Cancelled  - Schedule cancelled
NotificationPreference.Updated  - User preferences updated
NotificationChannelPreference.Set - Channel preference configured
```

## Idempotency

The Notification plugin ensures idempotency through multiple mechanisms:

1. **UNIQUE Constraints**:
   - `notification_message.message_key` - Prevents duplicate messages
   - `notification_template(code, version, locale, channel)` - Prevents duplicate templates
   - `notification_preference(account_id, person_id)` - One preference per user
   - `notification_channel_preference(preference_id, channel)` - One setting per channel

2. **Idempotency-Key Header**: Required for:
   - NotificationDelivery.Record
   - NotificationSchedule.Create

3. **State Checks**: All state transitions validate current state before updating

## Typical Workflows

### Send Notification Flow

1. Client calls `NotificationMessage.Send` with template_code and variables
2. System validates template exists and is active
3. System checks user preferences (quiet hours, channel enabled)
4. System creates message with status='queued'
5. Background worker calls `NotificationMessage.ProcessNext`
6. System locks message, creates delivery attempt, sets status='sending'
7. Worker renders template with variables and sends via provider
8. Worker calls `NotificationDelivery.Record` with result
9. System updates message status='sent' or retries/fails based on result

### Template Versioning Flow

1. Admin creates template v1: `NotificationTemplate.Create`
2. Template is used by messages
3. Admin needs to update: `NotificationTemplate.Update`
4. System archives v1 (status='archived'), creates v2 (status='active')
5. New messages use v2, existing messages still reference v1
6. All versions preserved for audit trail

### Scheduled Notification Flow

1. System creates message with scheduled_for in future
2. System calls `NotificationSchedule.Create` with fire_at
3. Background scheduler queries pending schedules where fire_at <= NOW()
4. Scheduler calls `NotificationSchedule.Fire` for each ready schedule
5. System transitions message to status='queued'
6. Normal delivery flow proceeds

### User Preference Management

1. User visits notification settings
2. Frontend calls `NotificationPreference.Get` (auto-creates if missing)
3. User configures quiet hours (22:00-08:00) and channels
4. Frontend calls `NotificationPreference.Update` and `NotificationChannelPreference.Set`
5. Future messages respect these preferences
6. User can opt-out entirely by setting status='inactive'

## Channel Support

The plugin supports multiple notification channels:

- **email** - Email notifications (subject + body)
- **sms** - SMS/text messages (body only)
- **push** - Push notifications (subject + body)
- **in_app** - In-app notifications
- **webhook** - Webhook callbacks
- **custom** - Custom channels via providers

Each channel can have:
- Different templates (channel-specific content)
- Different providers (SendGrid, Twilio, FCM, etc.)
- Different destinations (email address, phone number, device token)
- Different priorities

## Retry Mechanism

Messages are automatically retried on failure:

1. Default max_attempts = 5
2. Each failed attempt increments attempt_count
3. If attempt_count < max_attempts: status='queued' (retry)
4. If attempt_count >= max_attempts: status='failed' (exhausted)
5. Manual retry via `NotificationMessage.Retry` resets counter

Retry delays can be configured via:
- Exponential backoff in background worker
- notification_schedule for specific retry timing

## Quiet Hours

User preferences support quiet hours:

```json
{
  "quiet_hours": {
    "enabled": true,
    "timezone": "America/Los_Angeles",
    "start": "22:00",
    "end": "08:00"
  }
}
```

When sending during quiet hours:
- Messages are held (status='queued', scheduled_for after quiet hours end)
- Or messages are suppressed entirely based on configuration

## Template Variables

Templates support variable substitution:

```
Template Body:
"Hello {{first_name}}, your order #{{order_id}} has been {{status}}."

Payload Variables:
{
  "first_name": "John",
  "order_id": "12345",
  "status": "shipped"
}

Rendered Output:
"Hello John, your order #12345 has been shipped."
```

Variable schema can be defined for validation:
```json
{
  "variables_schema_json": {
    "first_name": { "type": "string", "required": true },
    "order_id": { "type": "string", "required": true },
    "status": { "type": "string", "required": true }
  }
}
```

## Provider Integration

Delivery providers are configured per channel:

- **Email**: SendGrid, Mailgun, AWS SES, SMTP
- **SMS**: Twilio, Nexmo, AWS SNS
- **Push**: FCM (Firebase), APNS (Apple), OneSignal
- **Webhook**: HTTP POST to custom endpoints

Provider responses are stored in:
- `provider_ref` - External reference ID
- `provider_payload` - Full provider response JSON
- `error_code` - Provider error code
- `error_message` - Provider error description

## Module Structure

```
src/plugins/notification/
├── entities/           6 entity files
├── dto/                6 request DTOs
├── repositories/       6 repository files
├── services/           notification.workflow.service.ts (18 commands)
├── controllers/        notification.controller.ts (18 endpoints)
├── notification.module.ts  Module definition
├── index.ts            Barrel exports
└── README.md           This file
```

## Usage Example

```typescript
// Inject the workflow service
constructor(private readonly notificationWorkflow: NotificationWorkflowService) {}

// Send a notification
const { message_id } = await this.notificationWorkflow.sendNotificationMessage({
  message_key: 'order-123-shipped',
  template_code: 'order_shipped',
  account_id: '42',
  person_id: '123',
  channel: 'email',
  destination: 'user@example.com',
  payload_vars: {
    first_name: 'John',
    order_id: '123',
    tracking_url: 'https://track.example.com/123',
  },
});

// Process next queued message (background worker)
const message = await this.notificationWorkflow.processNextMessage();
if (message) {
  // Render template and send via provider
  const rendered = renderTemplate(message.template_data);
  const result = await sendViaProvider(rendered);

  // Record delivery result
  await this.notificationWorkflow.recordDeliveryAttempt(message.message_id, {
    provider: 'sendgrid',
    status: result.success ? 'sent' : 'failed',
    provider_ref: result.messageId,
    error_code: result.error?.code,
    error_message: result.error?.message,
  });
}

// Create template
const { template_id } = await this.notificationWorkflow.createNotificationTemplate({
  code: 'order_shipped',
  name: 'Order Shipped Notification',
  channel: 'email',
  locale: 'en',
  subject_tpl: 'Your order #{{order_id}} has shipped!',
  body_tpl: 'Hello {{first_name}}, your order is on the way...',
  variables_schema_json: {
    first_name: { type: 'string', required: true },
    order_id: { type: 'string', required: true },
  },
});

// Schedule notification for future
const { schedule_id } = await this.notificationWorkflow.createNotificationSchedule(
  message_id,
  {
    schedule_type: 'one_time',
    fire_at: new Date('2026-03-16T10:00:00Z').toISOString(),
  },
);

// Configure user preferences
const prefs = await this.notificationWorkflow.getNotificationPreference(42, 123);
await this.notificationWorkflow.setChannelPreference(prefs.preference_id, {
  channel: 'email',
  enabled: true,
  destination: 'user@example.com',
  priority: 1,
});
```

## Dependencies

- **NestJS**: Framework
- **TypeORM**: ORM
- **class-validator**: DTO validation

## P0 Foundation Pillar

This plugin is part of the **P0 Foundation** pillars (defined in `P0-PILLAR-BUILD-PLAN.md`):

- Permission Management ✅
- Person Management ✅
- User Management ✅
- File Management ✅
- **Notification** ✅ (this plugin)

The Notification plugin provides essential multi-channel communication capabilities that all other features can build upon.
