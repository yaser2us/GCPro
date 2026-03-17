import { Injectable, NotFoundException } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { AccountRepository } from '../repositories/account.repo';
import { AccountPersonRepository } from '../repositories/account-person.repo';
import { WalletRepository } from '../repositories/wallet.repo';
import { WalletBalanceSnapshotRepository } from '../repositories/wallet-balance-snapshot.repo';

/**
 * Wallet Service
 *
 * Provides shared wallet operations used by multiple handlers
 * - Find or create account for user
 * - Find or create wallet for account
 * - Auto-initialization logic
 *
 * This service is used by:
 * - MissionRewardHandler
 * - ClaimPayoutHandler (future)
 * - CommissionHandler (future)
 * - etc.
 */
@Injectable()
export class WalletService {
  constructor(
    private readonly accountRepo: AccountRepository,
    private readonly accountPersonRepo: AccountPersonRepository,
    private readonly walletRepo: WalletRepository,
    private readonly balanceSnapshotRepo: WalletBalanceSnapshotRepository,
  ) {}

  /**
   * Find or create account for a user
   *
   * Flow:
   * 1. Try to find existing account via user → person → account linkage
   * 2. If not found, create new account and link to person
   *
   * @param user_id - User ID
   * @param queryRunner - Transaction context
   * @returns Account entity
   * @throws NotFoundException if person not found for user
   */
  async findOrCreateAccountForUser(
    user_id: number,
    queryRunner: QueryRunner,
  ): Promise<any> {
    // Try to find existing account
    let account = await this.accountRepo.findByUserId(user_id, queryRunner);

    if (account) {
      return account;
    }

    // Account doesn't exist, need to create one
    // First, find the person for this user
    const personResult = await queryRunner.manager.query(
      `SELECT * FROM person WHERE primary_user_id = ?`,
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

    // Reload and return account
    account = await this.accountRepo.findById(account_id, queryRunner);

    if (!account) {
      throw new Error('Account creation failed');
    }

    return account;
  }

  /**
   * Find or create wallet for an account
   *
   * Flow:
   * 1. Try to find existing wallet for account/currency/type
   * 2. If not found, create new wallet and initialize balance snapshot
   *
   * @param account_id - Account ID
   * @param currency - Currency code (e.g., 'COIN')
   * @param wallet_type - Wallet type (e.g., 'MAIN')
   * @param queryRunner - Transaction context
   * @returns Wallet entity
   */
  async findOrCreateWallet(
    account_id: number,
    currency: string = 'COIN',
    wallet_type: string = 'MAIN',
    queryRunner: QueryRunner,
  ): Promise<any> {
    // Try to find existing wallet
    let wallet = await this.walletRepo.findByAccountAndCurrency(
      account_id,
      currency,
      wallet_type,
      queryRunner,
    );

    if (wallet) {
      return wallet;
    }

    // Wallet doesn't exist, create one
    const wallet_id = await this.walletRepo.createOrGet(
      {
        account_id,
        wallet_type,
        currency,
        status: 'active',
      },
      queryRunner,
    );

    // Initialize balance snapshot with zero balance
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

    // Reload and return wallet
    wallet = await this.walletRepo.findById(wallet_id, queryRunner);

    if (!wallet) {
      throw new Error('Wallet creation failed');
    }

    return wallet;
  }

  /**
   * Find or create complete wallet setup for a user
   *
   * Combines account and wallet creation in one call
   * This is the most common operation for event handlers
   *
   * @param user_id - User ID
   * @param currency - Currency code (default: 'COIN')
   * @param wallet_type - Wallet type (default: 'MAIN')
   * @param queryRunner - Transaction context
   * @returns Object with account and wallet
   */
  async findOrCreateUserWallet(
    user_id: number,
    currency: string = 'COIN',
    wallet_type: string = 'MAIN',
    queryRunner: QueryRunner,
  ): Promise<{ account: any; wallet: any }> {
    // Get or create account
    const account = await this.findOrCreateAccountForUser(user_id, queryRunner);

    // Get or create wallet
    const wallet = await this.findOrCreateWallet(
      account.id,
      currency,
      wallet_type,
      queryRunner,
    );

    return { account, wallet };
  }
}
