import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { OutboxService } from '../../../corekit/services/outbox.service';
import { AccountRepository } from '../repositories/account.repo';
import { AccountPersonRepository } from '../repositories/account-person.repo';
import { WalletRepository } from '../repositories/wallet.repo';
import { WalletBalanceSnapshotRepository } from '../repositories/wallet-balance-snapshot.repo';
import { LedgerTxnRepository } from '../repositories/ledger-txn.repo';
import { LedgerEntryRepository } from '../repositories/ledger-entry.repo';
import { AccountCreateRequestDto } from '../dto/account-create.request.dto';
import { WalletCreateRequestDto } from '../dto/wallet-create.request.dto';
import { DepositRequestDto } from '../dto/deposit.request.dto';
import { WithdrawRequestDto } from '../dto/withdraw.request.dto';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * Wallet Workflow Service
 * Implements wallet commands following the workflow discipline:
 * Guard → Validate → Write → Emit → Commit
 *
 * Based on specs/wallet/wallet.pillar.v2.yml
 */
@Injectable()
export class WalletWorkflowService {
  constructor(
    private readonly txService: TransactionService,
    private readonly outboxService: OutboxService,
    private readonly accountRepo: AccountRepository,
    private readonly accountPersonRepo: AccountPersonRepository,
    private readonly walletRepo: WalletRepository,
    private readonly balanceSnapshotRepo: WalletBalanceSnapshotRepository,
    private readonly ledgerTxnRepo: LedgerTxnRepository,
    private readonly ledgerEntryRepo: LedgerEntryRepository,
  ) {}

  /**
   * ACCOUNT.CREATE COMMAND
   * Source: specs/wallet/wallet.pillar.v2.yml lines 668-703
   *
   * HTTP: POST /v1/accounts
   * Idempotency: Via Idempotency-Key header
   *
   * Flow:
   * 1. Guard: type is required
   * 2. Write: insert account with status='active'
   * 3. Emit: ACCOUNT_CREATED event
   */
  async createAccount(
    request: AccountCreateRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: type is required
      if (!request.type) {
        throw new BadRequestException({
          code: 'ACCOUNT_TYPE_REQUIRED',
          message: 'Account type is required',
        });
      }

      // WRITE: insert account
      const account_id = await this.accountRepo.create(
        {
          type: request.type,
          status: 'active',
        },
        queryRunner,
      );

      // EMIT: ACCOUNT_CREATED event
      await this.outboxService.enqueue(
        {
          event_name: 'ACCOUNT_CREATED',
          event_version: 1,
          aggregate_type: 'ACCOUNT',
          aggregate_id: String(account_id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `create-account-${account_id}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-create-account-${account_id}`,
          payload: {
            account_id,
            type: request.type,
            status: 'active',
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        account_id,
      };
    });

    return result;
  }

  /**
   * WALLET.CREATE COMMAND
   * Source: specs/wallet/wallet.pillar.v2.yml lines 704-755
   *
   * HTTP: POST /v1/wallets
   * Idempotency: UNIQUE(account_id, currency, wallet_type)
   *
   * Flow:
   * 1. Guard: account_id required, account exists
   * 2. Write: insert wallet (ON DUPLICATE KEY UPDATE)
   * 3. Write: insert/update wallet_balance_snapshot
   * 4. Emit: WALLET_CREATED event
   */
  async createWallet(
    request: WalletCreateRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: account_id is required
      if (!request.account_id) {
        throw new BadRequestException({
          code: 'ACCOUNT_ID_REQUIRED',
          message: 'Account ID is required',
        });
      }

      const accountId = Number(request.account_id);

      // GUARD: account exists
      const account = await this.accountRepo.findById(accountId, queryRunner);
      if (!account) {
        throw new NotFoundException({
          code: 'ACCOUNT_NOT_FOUND',
          message: `Account ${accountId} not found`,
        });
      }

      // WRITE: upsert wallet (idempotent by account_id, currency, wallet_type)
      const wallet_id = await this.walletRepo.createOrGet(
        {
          account_id: accountId,
          wallet_type: request.wallet_type || 'MAIN',
          currency: request.currency || 'COIN',
          status: 'active',
        },
        queryRunner,
      );

      // WRITE: upsert wallet_balance_snapshot
      await this.balanceSnapshotRepo.upsert(
        {
          wallet_id,
          available_amount: '0.00',
          held_amount: '0.00',
          total_amount: '0.00',
          as_of: new Date(),
        },
        queryRunner,
      );

      // EMIT: WALLET_CREATED event
      await this.outboxService.enqueue(
        {
          event_name: 'WALLET_CREATED',
          event_version: 1,
          aggregate_type: 'WALLET',
          aggregate_id: String(wallet_id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `create-wallet-${wallet_id}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-create-wallet-${wallet_id}`,
          payload: {
            wallet_id,
            account_id: accountId,
            wallet_type: request.wallet_type || 'MAIN',
            currency: request.currency || 'COIN',
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      return {
        wallet_id,
      };
    });

    return result;
  }

  /**
   * WALLET.DEPOSIT COMMAND
   * Source: specs/wallet/wallet.pillar.v2.yml lines 756-839
   *
   * HTTP: POST /v1/wallets/{wallet_id}/deposit
   * Idempotency: Via Idempotency-Key header
   *
   * Flow:
   * 1. Guard: wallet exists, status='active', amount > 0
   * 2. Write: ledger_txn
   * 3. Write: ledger_entry (debit system, credit user)
   * 4. Write: update wallet_balance_snapshot
   * 5. Emit: WALLET_CREDITED, LEDGER_TRANSACTION_CREATED
   */
  async deposit(
    wallet_id: number,
    request: DepositRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: wallet exists
      const wallet = await this.walletRepo.findById(wallet_id, queryRunner);
      if (!wallet) {
        throw new NotFoundException({
          code: 'WALLET_NOT_FOUND',
          message: `Wallet ${wallet_id} not found`,
        });
      }

      // GUARD: wallet.status = 'active'
      if (wallet.status !== 'active') {
        throw new ConflictException({
          code: 'WALLET_NOT_ACTIVE',
          message: `Wallet is not active, current status: ${wallet.status}`,
        });
      }

      // GUARD: amount > 0
      if (request.amount <= 0) {
        throw new BadRequestException({
          code: 'INVALID_AMOUNT',
          message: 'Amount must be greater than 0',
        });
      }

      // WRITE: ledger_txn
      const ledger_txn_id = await this.ledgerTxnRepo.create(
        {
          account_id: wallet.account_id,
          type: request.type,
          status: 'posted',
          ref_type: request.ref_type || null,
          ref_id: request.ref_id || null,
          idempotency_key: idempotencyKey,
          meta_json: request.meta_json || null,
          occurred_at: new Date(),
          posted_at: new Date(),
        },
        queryRunner,
      );

      // WRITE: ledger_entry (debit system account - money coming from system)
      await this.ledgerEntryRepo.create(
        {
          txn_id: ledger_txn_id,
          account_id: 1, // System account
          entry_type: 'principal',
          direction: 'debit',
          amount: String(request.amount),
          currency: request.currency,
        },
        queryRunner,
      );

      // WRITE: ledger_entry (credit user account - money going to user)
      await this.ledgerEntryRepo.create(
        {
          txn_id: ledger_txn_id,
          account_id: wallet.account_id,
          entry_type: 'principal',
          direction: 'credit',
          amount: String(request.amount),
          currency: request.currency,
        },
        queryRunner,
      );

      // WRITE: update wallet_balance_snapshot
      await this.balanceSnapshotRepo.incrementAvailable(
        wallet_id,
        String(request.amount),
        queryRunner,
      );

      // Fetch updated balance
      const updatedBalance = await this.balanceSnapshotRepo.findByWalletId(
        wallet_id,
        queryRunner,
      );

      // EMIT: WALLET_CREDITED
      await this.outboxService.enqueue(
        {
          event_name: 'WALLET_CREDITED',
          event_version: 1,
          aggregate_type: 'WALLET',
          aggregate_id: String(wallet_id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `deposit-${wallet_id}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-deposit-${wallet_id}`,
          payload: {
            wallet_id,
            ledger_txn_id,
            amount: request.amount,
            currency: request.currency,
            new_balance: updatedBalance?.total_amount || '0.00',
            ref_type: request.ref_type || null,
            ref_id: request.ref_id || null,
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      // EMIT: LEDGER_TRANSACTION_CREATED
      await this.outboxService.enqueue(
        {
          event_name: 'LEDGER_TRANSACTION_CREATED',
          event_version: 1,
          aggregate_type: 'ACCOUNT',
          aggregate_id: String(wallet.account_id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `deposit-${wallet_id}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-deposit-${wallet_id}`,
          payload: {
            ledger_txn_id,
            account_id: wallet.account_id,
            type: request.type,
            total_debits: request.amount,
            total_credits: request.amount,
          },
        },
        queryRunner,
      );

      return {
        ledger_txn_id,
        new_balance: updatedBalance?.total_amount || '0.00',
      };
    });

    return result;
  }

  /**
   * WALLET.WITHDRAW COMMAND
   * Source: specs/wallet/wallet.pillar.v2.yml lines 840-922
   *
   * HTTP: POST /v1/wallets/{wallet_id}/withdraw
   * Idempotency: Via Idempotency-Key header
   *
   * Flow:
   * 1. Guard: wallet exists, status='active', amount > 0, balance >= amount
   * 2. Write: ledger_txn
   * 3. Write: ledger_entry (debit user, credit system)
   * 4. Write: update wallet_balance_snapshot
   * 5. Emit: WALLET_DEBITED, LEDGER_TRANSACTION_CREATED
   */
  async withdraw(
    wallet_id: number,
    request: WithdrawRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: wallet exists
      const wallet = await this.walletRepo.findById(wallet_id, queryRunner);
      if (!wallet) {
        throw new NotFoundException({
          code: 'WALLET_NOT_FOUND',
          message: `Wallet ${wallet_id} not found`,
        });
      }

      // GUARD: wallet.status = 'active'
      if (wallet.status !== 'active') {
        throw new ConflictException({
          code: 'WALLET_NOT_ACTIVE',
          message: `Wallet is not active, current status: ${wallet.status}`,
        });
      }

      // GUARD: amount > 0
      if (request.amount <= 0) {
        throw new BadRequestException({
          code: 'INVALID_AMOUNT',
          message: 'Amount must be greater than 0',
        });
      }

      // Fetch current balance
      const currentBalance = await this.balanceSnapshotRepo.findByWalletId(
        wallet_id,
        queryRunner,
      );

      // GUARD: balance >= amount
      if (!currentBalance || Number(currentBalance.available_amount) < request.amount) {
        throw new ConflictException({
          code: 'INSUFFICIENT_BALANCE',
          message: `Insufficient balance. Available: ${currentBalance?.available_amount || 0}, Required: ${request.amount}`,
        });
      }

      // WRITE: ledger_txn
      const ledger_txn_id = await this.ledgerTxnRepo.create(
        {
          account_id: wallet.account_id,
          type: request.type,
          status: 'posted',
          idempotency_key: idempotencyKey,
          meta_json: request.meta_json || null,
          occurred_at: new Date(),
          posted_at: new Date(),
        },
        queryRunner,
      );

      // WRITE: ledger_entry (debit user account - money leaving user)
      await this.ledgerEntryRepo.create(
        {
          txn_id: ledger_txn_id,
          account_id: wallet.account_id,
          entry_type: 'principal',
          direction: 'debit',
          amount: String(request.amount),
          currency: request.currency,
        },
        queryRunner,
      );

      // WRITE: ledger_entry (credit system account - money returning to system)
      await this.ledgerEntryRepo.create(
        {
          txn_id: ledger_txn_id,
          account_id: 1, // System account
          entry_type: 'principal',
          direction: 'credit',
          amount: String(request.amount),
          currency: request.currency,
        },
        queryRunner,
      );

      // WRITE: update wallet_balance_snapshot
      await this.balanceSnapshotRepo.decrementAvailable(
        wallet_id,
        String(request.amount),
        queryRunner,
      );

      // Fetch updated balance
      const updatedBalance = await this.balanceSnapshotRepo.findByWalletId(
        wallet_id,
        queryRunner,
      );

      // EMIT: WALLET_DEBITED
      await this.outboxService.enqueue(
        {
          event_name: 'WALLET_DEBITED',
          event_version: 1,
          aggregate_type: 'WALLET',
          aggregate_id: String(wallet_id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `withdraw-${wallet_id}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-withdraw-${wallet_id}`,
          payload: {
            wallet_id,
            ledger_txn_id,
            amount: request.amount,
            currency: request.currency,
            new_balance: updatedBalance?.total_amount || '0.00',
          },
          dedupe_key: idempotencyKey,
        },
        queryRunner,
      );

      // EMIT: LEDGER_TRANSACTION_CREATED
      await this.outboxService.enqueue(
        {
          event_name: 'LEDGER_TRANSACTION_CREATED',
          event_version: 1,
          aggregate_type: 'ACCOUNT',
          aggregate_id: String(wallet.account_id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: actor.correlation_id || `withdraw-${wallet_id}-${Date.now()}`,
          causation_id: actor.causation_id || `cmd-withdraw-${wallet_id}`,
          payload: {
            ledger_txn_id,
            account_id: wallet.account_id,
            type: request.type,
            total_debits: request.amount,
            total_credits: request.amount,
          },
        },
        queryRunner,
      );

      return {
        ledger_txn_id,
        new_balance: updatedBalance?.total_amount || '0.00',
      };
    });

    return result;
  }

  /**
   * WALLET.GET_BALANCE QUERY
   * Source: specs/wallet/wallet.pillar.v2.yml lines 923-950
   *
   * HTTP: GET /v1/wallets/{wallet_id}/balance
   *
   * Flow:
   * 1. Read: wallet with balance_snapshot
   * 2. Guard: wallet exists
   */
  async getBalance(wallet_id: number) {
    const wallet = await this.walletRepo.findById(wallet_id);
    if (!wallet) {
      throw new NotFoundException({
        code: 'WALLET_NOT_FOUND',
        message: `Wallet ${wallet_id} not found`,
      });
    }

    const balance = await this.balanceSnapshotRepo.findByWalletId(wallet_id);

    return {
      wallet_id,
      available_amount: balance?.available_amount || '0.00',
      held_amount: balance?.held_amount || '0.00',
      total_amount: balance?.total_amount || '0.00',
      currency: wallet.currency,
      as_of: balance?.as_of || new Date(),
    };
  }

  /**
   * WALLET.GET_TRANSACTIONS QUERY
   * Source: specs/wallet/wallet.pillar.v2.yml lines 951-971
   *
   * HTTP: GET /v1/wallets/{wallet_id}/transactions
   *
   * Flow:
   * 1. Read: ledger_txn with entries for the wallet's account
   */
  async getTransactions(wallet_id: number, limit: number = 50, offset: number = 0) {
    const wallet = await this.walletRepo.findById(wallet_id);
    if (!wallet) {
      throw new NotFoundException({
        code: 'WALLET_NOT_FOUND',
        message: `Wallet ${wallet_id} not found`,
      });
    }

    const transactions = await this.ledgerTxnRepo.listByAccount(
      wallet.account_id,
      limit,
      offset,
    );

    return {
      items: transactions,
    };
  }

  /**
   * WALLET.PROCESS_MISSION_REWARD EVENT CONSUMER
   * Source: specs/wallet/wallet.pillar.v2.yml lines 976-1128
   *
   * Trigger: MISSION_REWARD_GRANTED event from missions plugin
   * Idempotency: Via ledger_txn.idempotency_key = 'mission_reward_{reward_grant_id}'
   *
   * Flow:
   * 1. Read: mission_reward_grant details
   * 2. Guard: reward_grant exists, valid status/type/amount
   * 3. Read: account via person linkage
   * 4. Auto-create account if not exists
   * 5. Auto-create wallet if not exists
   * 6. Write: ledger_txn with double-entry
   * 7. Write: update wallet_balance_snapshot
   * 8. Write: update mission_reward_grant ref fields
   * 9. Emit: WALLET_CREDITED
   */
  async processMissionReward(event: {
    reward_grant_id: number;
    assignment_id: number;
    user_id: number;
  }) {
    const result = await this.txService.run(async (queryRunner) => {
      const { reward_grant_id, assignment_id, user_id } = event;

      // READ: mission_reward_grant from missions plugin
      const rewardGrantResult = await queryRunner.manager.query(
        `
        SELECT * FROM mission_reward_grant WHERE id = ?
        `,
        [reward_grant_id],
      );
      const reward_grant = rewardGrantResult[0];

      // GUARD: reward_grant exists
      if (!reward_grant) {
        throw new NotFoundException({
          code: 'REWARD_GRANT_NOT_FOUND',
          message: `Reward grant ${reward_grant_id} not found`,
        });
      }

      // GUARD: validate reward_grant
      if (reward_grant.user_id !== user_id) {
        throw new ConflictException({
          code: 'REWARD_GRANT_USER_MISMATCH',
          message: `Reward grant user_id ${reward_grant.user_id} does not match event user_id ${user_id}`,
        });
      }

      if (Number(reward_grant.amount) <= 0) {
        throw new BadRequestException({
          code: 'INVALID_REWARD_AMOUNT',
          message: `Reward amount must be greater than 0, got ${reward_grant.amount}`,
        });
      }

      if (reward_grant.reward_type !== 'coins') {
        throw new BadRequestException({
          code: 'UNSUPPORTED_REWARD_TYPE',
          message: `Only 'coins' reward type is supported, got ${reward_grant.reward_type}`,
        });
      }

      if (reward_grant.currency !== 'COIN') {
        throw new BadRequestException({
          code: 'UNSUPPORTED_CURRENCY',
          message: `Only 'COIN' currency is supported, got ${reward_grant.currency}`,
        });
      }

      if (reward_grant.status !== 'requested') {
        throw new ConflictException({
          code: 'REWARD_NOT_REQUESTED',
          message: `Reward status is ${reward_grant.status}, expected 'requested'`,
        });
      }

      // READ: account via person linkage (user → person → account_person → account)
      let account = await this.accountRepo.findByUserId(user_id, queryRunner);

      // AUTO_CREATE_ACCOUNT_IF_NOT_EXISTS
      if (!account) {
        // Find person by user_id
        const personResult = await queryRunner.manager.query(
          `
          SELECT * FROM person WHERE primary_user_id = ?
          `,
          [user_id],
        );
        const person = personResult[0];

        if (!person) {
          throw new NotFoundException({
            code: 'PERSON_NOT_FOUND',
            message: `Person with user_id ${user_id} not found`,
          });
        }

        // Create account
        const account_id = await this.accountRepo.create(
          {
            type: 'user',
            status: 'active',
          },
          queryRunner,
        );

        // Link account to person
        await this.accountPersonRepo.create(
          {
            account_id,
            person_id: person.id,
            role: 'owner',
          },
          queryRunner,
        );

        // Reload account
        account = await this.accountRepo.findById(account_id, queryRunner);
      }

      if (!account) {
        throw new Error('Account creation failed');
      }

      // READ: wallet
      let wallet = await this.walletRepo.findByAccountAndCurrency(
        account.id,
        'COIN',
        'MAIN',
        queryRunner,
      );

      // AUTO_CREATE_WALLET_IF_NOT_EXISTS
      if (!wallet) {
        const wallet_id = await this.walletRepo.createOrGet(
          {
            account_id: account.id,
            wallet_type: 'MAIN',
            currency: 'COIN',
            status: 'active',
          },
          queryRunner,
        );

        // Initialize balance snapshot
        await this.balanceSnapshotRepo.upsert(
          {
            wallet_id,
            available_amount: '0.00',
            held_amount: '0.00',
            total_amount: '0.00',
            as_of: new Date(),
          },
          queryRunner,
        );

        // Reload wallet
        wallet = await this.walletRepo.findById(wallet_id, queryRunner);
      }

      if (!wallet) {
        throw new Error('Wallet creation failed');
      }

      // WRITE: ledger_txn (idempotent by idempotency_key)
      const idempotency_key = `mission_reward_${reward_grant_id}`;

      // Check if already processed
      const existingTxn = await this.ledgerTxnRepo.findByIdempotencyKey(
        idempotency_key,
        queryRunner,
      );

      if (existingTxn) {
        // Already processed, return early
        const currentBalance = await this.balanceSnapshotRepo.findByWalletId(
          wallet.id,
          queryRunner,
        );
        return {
          ledger_txn_id: existingTxn.id,
          new_balance: currentBalance?.total_amount || '0.00',
          already_processed: true,
        };
      }

      const ledger_txn_id = await this.ledgerTxnRepo.create(
        {
          account_id: account.id,
          type: 'mission_reward',
          status: 'posted',
          ref_type: 'mission_reward_grant',
          ref_id: String(reward_grant_id),
          idempotency_key,
          meta_json: {
            assignment_id,
            user_id,
          },
          occurred_at: new Date(),
          posted_at: new Date(),
        },
        queryRunner,
      );

      // WRITE: ledger_entry (debit system account)
      await this.ledgerEntryRepo.create(
        {
          txn_id: ledger_txn_id,
          account_id: 1, // System account
          entry_type: 'principal',
          direction: 'debit',
          amount: String(reward_grant.amount),
          currency: 'COIN',
        },
        queryRunner,
      );

      // WRITE: ledger_entry (credit user account)
      await this.ledgerEntryRepo.create(
        {
          txn_id: ledger_txn_id,
          account_id: account.id,
          entry_type: 'principal',
          direction: 'credit',
          amount: String(reward_grant.amount),
          currency: 'COIN',
        },
        queryRunner,
      );

      // WRITE: update wallet_balance_snapshot
      await this.balanceSnapshotRepo.incrementAvailable(
        wallet.id,
        String(reward_grant.amount),
        queryRunner,
      );

      // WRITE: update mission_reward_grant ref fields and status
      await queryRunner.manager.query(
        `
        UPDATE mission_reward_grant
        SET ref_type = ?, ref_id = ?, status = ?
        WHERE id = ?
        `,
        ['ledger_txn', String(ledger_txn_id), 'granted', reward_grant_id],
      );

      // Fetch updated balance
      const updatedBalance = await this.balanceSnapshotRepo.findByWalletId(
        wallet.id,
        queryRunner,
      );

      // EMIT: WALLET_CREDITED
      await this.outboxService.enqueue(
        {
          event_name: 'WALLET_CREDITED',
          event_version: 1,
          aggregate_type: 'WALLET',
          aggregate_id: String(wallet.id),
          actor_user_id: String(user_id),
          occurred_at: new Date(),
          correlation_id: `mission-reward-${reward_grant_id}-${Date.now()}`,
          causation_id: `event-mission-reward-granted-${reward_grant_id}`,
          payload: {
            wallet_id: wallet.id,
            ledger_txn_id,
            amount: Number(reward_grant.amount),
            currency: 'COIN',
            new_balance: updatedBalance?.total_amount || '0.00',
            ref_type: 'mission_reward_grant',
            ref_id: String(reward_grant_id),
          },
        },
        queryRunner,
      );

      return {
        ledger_txn_id,
        new_balance: updatedBalance?.total_amount || '0.00',
      };
    });

    return result;
  }
}
