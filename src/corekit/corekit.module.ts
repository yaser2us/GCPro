import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionService } from './services/transaction.service';
import { OutboxService } from './services/outbox.service';
import { EventBusService } from './services/event-bus.service';
import { OutboxProcessorService } from './services/outbox-processor.service';
import { JwtService } from './services/jwt.service';
import { OutboxEvent } from './entities/outbox-event.entity';
import { AuthGuard } from './guards/auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { StepRunner } from './steps/step.runner';

/**
 * CoreKit Module - Foundation Infrastructure
 * Based on corekit.foundation.v1.yml
 *
 * Provides shared infrastructure services to all plugins:
 * - TransactionService: Transaction management (lines 20-23)
 * - OutboxService: Event outbox (lines 45-50)
 * - StepRunner: Workflow step execution (lines 58-127)
 * - Guards: Auth and permissions (lines 30-33)
 *
 * @Global decorator makes services available everywhere
 * without needing to import this module in each plugin
 *
 * Note: Idempotency is enforced via DB unique constraints on idempotency_key columns
 * per corekit.foundation.v1.yml lines 35-43: "Prefer DB constraints"
 */
@Global()
@Module({
  imports: [
    // Register CoreKit entities with TypeORM
    TypeOrmModule.forFeature([OutboxEvent]),
  ],
  providers: [
    // Core services
    TransactionService,
    OutboxService,
    EventBusService,
    OutboxProcessorService,
    StepRunner,
    JwtService,
    // Guards
    AuthGuard,
    PermissionsGuard,
  ],
  exports: [
    // Export services for plugins to use
    TransactionService,
    OutboxService,
    EventBusService,
    OutboxProcessorService,
    StepRunner,
    JwtService,
    AuthGuard,
    PermissionsGuard,
  ],
})
export class CoreKitModule {}
