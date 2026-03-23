import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './entities/account.entity';
import { AccountPerson } from './entities/account-person.entity';
import { Wallet } from './entities/wallet.entity';
import { WalletBalanceSnapshot } from './entities/wallet-balance-snapshot.entity';
import { LedgerTxn } from './entities/ledger-txn.entity';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { WalletDepositIntent } from './entities/wallet-deposit-intent.entity';
import { WalletSpendIntent } from './entities/wallet-spend-intent.entity';
import { WalletWithdrawalRequest } from './entities/wallet-withdrawal-request.entity';
import { WalletHold } from './entities/wallet-hold.entity';
import { WalletPayoutAttempt } from './entities/wallet-payout-attempt.entity';
import { WalletBatch } from './entities/wallet-batch.entity';
import { WalletBatchItem } from './entities/wallet-batch-item.entity';
import { WalletRuleSet } from './entities/wallet-rule-set.entity';
import { WalletRule } from './entities/wallet-rule.entity';
import { WalletThresholdRule } from './entities/wallet-threshold-rule.entity';
import { WalletThresholdEvent } from './entities/wallet-threshold-event.entity';
import { WalletPolicyGate } from './entities/wallet-policy-gate.entity';
import { AccountRepository } from './repositories/account.repo';
import { AccountPersonRepository } from './repositories/account-person.repo';
import { WalletRepository } from './repositories/wallet.repo';
import { WalletBalanceSnapshotRepository } from './repositories/wallet-balance-snapshot.repo';
import { LedgerTxnRepository } from './repositories/ledger-txn.repo';
import { LedgerEntryRepository } from './repositories/ledger-entry.repo';
import { WalletDepositIntentRepository } from './repositories/wallet-deposit-intent.repo';
import { WalletSpendIntentRepository } from './repositories/wallet-spend-intent.repo';
import { WalletWithdrawalRequestRepository } from './repositories/wallet-withdrawal-request.repo';
import { WalletHoldRepository } from './repositories/wallet-hold.repo';
import { WalletPayoutAttemptRepository } from './repositories/wallet-payout-attempt.repo';
import { WalletBatchRepository } from './repositories/wallet-batch.repo';
import { WalletBatchItemRepository } from './repositories/wallet-batch-item.repo';
import { WalletRuleSetRepository } from './repositories/wallet-rule-set.repo';
import { WalletRuleRepository } from './repositories/wallet-rule.repo';
import { WalletThresholdRuleRepository } from './repositories/wallet-threshold-rule.repo';
import { WalletThresholdEventRepository } from './repositories/wallet-threshold-event.repo';
import { WalletPolicyGateRepository } from './repositories/wallet-policy-gate.repo';

// Shared Services (used by multiple handlers)
import { WalletService } from './services/wallet.service';
import { LedgerService } from './services/ledger.service';
import { BalanceService } from './services/balance.service';
import { WalletWorkflowService } from './services/wallet.workflow.service';
import { WalletAdvancedWorkflowService } from './services/wallet-advanced.workflow.service';
import { PaymentPriorityService } from './services/payment-priority.service';

// Event Handlers (one per event type)
import { MissionRewardHandler } from './handlers/mission-reward.handler';
import { CommissionAccrualHandler } from './handlers/commission-accrual.handler';
import { PolicyActivatedHandler } from './handlers/policy-activated.handler';
import { PersonCreatedHandler } from './handlers/person-created.handler';
import { CrowdChargeHandler } from './handlers/crowd-charge.handler';
import { AutoTopupHandler } from './handlers/auto-topup.handler';                       // C4
import { DepositTopupPaymentHandler } from './handlers/deposit-topup-payment.handler'; // C4
import { ClaimSettledPayoutHandler } from './handlers/claim-settled-payout.handler';   // Phase 5
import { ReferralRewardHandler } from './handlers/referral-reward.handler';             // Phase 6
import { CommissionPayoutHandler } from './handlers/commission-payout.handler';         // Phase 7B
import { CrowdClaimPayoutHandler } from './handlers/crowd-claim-payout.handler';       // Phase 7C

// Event Consumers (one per event source)
import { MissionRewardConsumer } from './consumers/mission-reward.consumer';
import { CommissionAccrualConsumer } from './consumers/commission-accrual.consumer';
import { PolicyActivatedConsumer } from './consumers/policy-activated.consumer';
import { PersonCreatedConsumer } from './consumers/person-created.consumer';
import { CrowdPeriodCalculatedConsumer } from './consumers/crowd-period-calculated.consumer';
import { AutoTopupConsumer } from './consumers/auto-topup.consumer';                             // C4
import { DepositTopupPaymentConsumer } from './consumers/deposit-topup-payment.consumer';       // C4
import { ClaimSettledPayoutConsumer } from './consumers/claim-settled-payout.consumer';         // Phase 5
import { ReferralRewardConsumer } from './consumers/referral-reward.consumer';                   // Phase 6
import { CommissionPayoutConsumer } from './consumers/commission-payout.consumer';               // Phase 7B
import { CrowdClaimPayoutConsumer } from './consumers/crowd-claim-payout.consumer';             // Phase 7C

// Controllers
import { WalletController } from './controllers/wallet.controller';
import { DepositIntentController } from './controllers/deposit-intent.controller';
import { SpendIntentController } from './controllers/spend-intent.controller';
import { WithdrawalRequestController } from './controllers/withdrawal-request.controller';
import { WalletHoldController } from './controllers/wallet-hold.controller';
import { WalletBatchController } from './controllers/wallet-batch.controller';
import { WalletRuleSetController } from './controllers/wallet-rule-set.controller';
import { ThresholdRuleController } from './controllers/threshold-rule.controller';
import { ThresholdEventController } from './controllers/threshold-event.controller';
import { PolicyGateController } from './controllers/policy-gate.controller';
import { AutoTopupController } from './controllers/auto-topup.controller';             // C4
import { PaymentSourceController } from './controllers/payment-source.controller';     // L10

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
      WalletDepositIntent,
      WalletSpendIntent,
      WalletWithdrawalRequest,
      WalletHold,
      WalletPayoutAttempt,
      WalletBatch,
      WalletBatchItem,
      WalletRuleSet,
      WalletRule,
      WalletThresholdRule,
      WalletThresholdEvent,
      WalletPolicyGate,
    ]),
  ],
  controllers: [
    // HTTP controllers
    WalletController,
    DepositIntentController,
    SpendIntentController,
    WithdrawalRequestController,
    WalletHoldController,
    WalletBatchController,
    WalletRuleSetController,
    ThresholdRuleController,
    ThresholdEventController,
    PolicyGateController,
    AutoTopupController,    // C4
    PaymentSourceController, // L10
  ],
  providers: [
    // Repositories (data access layer)
    AccountRepository,
    AccountPersonRepository,
    WalletRepository,
    WalletBalanceSnapshotRepository,
    LedgerTxnRepository,
    LedgerEntryRepository,
    WalletDepositIntentRepository,
    WalletSpendIntentRepository,
    WalletWithdrawalRequestRepository,
    WalletHoldRepository,
    WalletPayoutAttemptRepository,
    WalletBatchRepository,
    WalletBatchItemRepository,
    WalletRuleSetRepository,
    WalletRuleRepository,
    WalletThresholdRuleRepository,
    WalletThresholdEventRepository,
    WalletPolicyGateRepository,

    // Shared Services (reusable across handlers)
    WalletService,
    LedgerService,
    BalanceService,

    // Legacy workflow service (for HTTP endpoints)
    // TODO: Refactor HTTP endpoints to use handlers too
    WalletWorkflowService,

    // Advanced workflow service
    WalletAdvancedWorkflowService,

    // L10: Payment priority resolver
    PaymentPriorityService,

    // Event Handlers (one per event type)
    MissionRewardHandler,
    CommissionAccrualHandler,
    PolicyActivatedHandler,
    PersonCreatedHandler,
    CrowdChargeHandler,             // C6
    AutoTopupHandler,               // C4
    DepositTopupPaymentHandler,     // C4
    ClaimSettledPayoutHandler,      // Phase 5
    ReferralRewardHandler,          // Phase 6
    CommissionPayoutHandler,        // Phase 7B
    CrowdClaimPayoutHandler,        // Phase 7C

    // Event Consumers (one per event source)
    MissionRewardConsumer,
    CommissionAccrualConsumer,
    PolicyActivatedConsumer,
    PersonCreatedConsumer,
    CrowdPeriodCalculatedConsumer,  // C6
    AutoTopupConsumer,              // C4
    DepositTopupPaymentConsumer,    // C4
    ClaimSettledPayoutConsumer,     // Phase 5
    ReferralRewardConsumer,         // Phase 6
    CommissionPayoutConsumer,       // Phase 7B
    CrowdClaimPayoutConsumer,       // Phase 7C
  ],
  exports: [
    // Export shared services for other modules
    WalletService,
    LedgerService,
    BalanceService,

    // Legacy exports
    WalletWorkflowService,

    // Advanced workflow service
    WalletAdvancedWorkflowService,

    // L10
    PaymentPriorityService,
  ],
})
export class WalletModule {}
