import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './entities/account.entity';
import { AccountPerson } from './entities/account-person.entity';
import { Wallet } from './entities/wallet.entity';
import { WalletBalanceSnapshot } from './entities/wallet-balance-snapshot.entity';
import { LedgerTxn } from './entities/ledger-txn.entity';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { AccountRepository } from './repositories/account.repo';
import { AccountPersonRepository } from './repositories/account-person.repo';
import { WalletRepository } from './repositories/wallet.repo';
import { WalletBalanceSnapshotRepository } from './repositories/wallet-balance-snapshot.repo';
import { LedgerTxnRepository } from './repositories/ledger-txn.repo';
import { LedgerEntryRepository } from './repositories/ledger-entry.repo';

// Shared Services (used by multiple handlers)
import { WalletService } from './services/wallet.service';
import { LedgerService } from './services/ledger.service';
import { BalanceService } from './services/balance.service';
import { WalletWorkflowService } from './services/wallet.workflow.service';

// Event Handlers (one per event type)
import { MissionRewardHandler } from './handlers/mission-reward.handler';

// Event Consumers (one per event source)
import { MissionRewardConsumer } from './consumers/mission-reward.consumer';

// Controllers
import { WalletController } from './controllers/wallet.controller';

/**
 * Wallet Module
 * Encapsulates all wallet-related functionality
 *
 * Based on specs/wallet/wallet.pillar.v2.yml
 *
 * Architecture:
 * - Shared Services: Core wallet/ledger/balance operations (reusable)
 * - Handlers: Event-specific business logic (one per event type)
 * - Consumers: Event routing (one per event source)
 * - Controllers: HTTP endpoints
 *
 * Features:
 * - Account management
 * - Wallet creation and management
 * - Deposit and withdrawal operations
 * - Double-entry ledger accounting
 * - Event-driven integrations (missions, claims, etc.)
 */
@Module({
  imports: [
    // Register Wallet entities with TypeORM
    TypeOrmModule.forFeature([
      Account,
      AccountPerson,
      Wallet,
      WalletBalanceSnapshot,
      LedgerTxn,
      LedgerEntry,
    ]),
  ],
  controllers: [
    // HTTP controllers
    WalletController,
  ],
  providers: [
    // Repositories (data access layer)
    AccountRepository,
    AccountPersonRepository,
    WalletRepository,
    WalletBalanceSnapshotRepository,
    LedgerTxnRepository,
    LedgerEntryRepository,

    // Shared Services (reusable across handlers)
    WalletService,
    LedgerService,
    BalanceService,

    // Legacy workflow service (for HTTP endpoints)
    // TODO: Refactor HTTP endpoints to use handlers too
    WalletWorkflowService,

    // Event Handlers (one per event type)
    MissionRewardHandler,
    // Future: ClaimPayoutHandler, CommissionHandler, etc.

    // Event Consumers (one per event source)
    MissionRewardConsumer,
    // Future: ClaimPayoutConsumer, CommissionConsumer, etc.
  ],
  exports: [
    // Export shared services for other modules
    WalletService,
    LedgerService,
    BalanceService,

    // Legacy exports
    WalletWorkflowService,
  ],
})
export class WalletModule {}
