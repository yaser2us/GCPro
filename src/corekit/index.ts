/**
 * CoreKit Foundation Exports
 * Based on corekit.foundation.v1.yml
 *
 * Centralized exports for all foundation infrastructure
 */

// Error handling
export * from './errors';

// Guard utilities
export * from './guard';

// Transaction management
export { TransactionService } from './services/transaction.service';

// Outbox pattern
export { OutboxService } from './services/outbox.service';

// Step execution
export * from './steps/step.types';
export * from './steps/step.context';
export * from './steps/step.runner';

// Type definitions
export * from './types/actor.type';
export * from './types/outbox-envelope.type';
export * from './types/money.type';

// Entities
export { OutboxEvent } from './entities/outbox-event.entity';

// Guards
export { AuthGuard } from './guards/auth.guard';
export { PermissionsGuard } from './guards/permissions.guard';

// Decorators
export { CurrentActor } from './decorators/current-actor.decorator';
export { RequirePermissions } from './decorators/require-permissions.decorator';

// Module
export { CoreKitModule } from './corekit.module';
