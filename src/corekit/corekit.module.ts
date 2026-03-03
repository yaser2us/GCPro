import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionService } from './services/transaction.service';
import { IdempotencyService } from './services/idempotency.service';
import { OutboxService } from './services/outbox.service';
import { IdempotencyRecord } from './entities/idempotency-record.entity';
import { OutboxEvent } from './entities/outbox-event.entity';
import { AuthGuard } from './guards/auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';

/**
 * CoreKit Module
 * Provides shared infrastructure services to all plugins
 *
 * @Global decorator makes services available everywhere
 * without needing to import this module in each plugin
 */
@Global()
@Module({
  imports: [
    // Register CoreKit entities with TypeORM
    TypeOrmModule.forFeature([IdempotencyRecord, OutboxEvent]),
  ],
  providers: [
    // Core services
    TransactionService,
    IdempotencyService,
    OutboxService,
    // Guards
    AuthGuard,
    PermissionsGuard,
  ],
  exports: [
    // Export services for plugins to use
    TransactionService,
    IdempotencyService,
    OutboxService,
    AuthGuard,
    PermissionsGuard,
  ],
})
export class CoreKitModule {}
