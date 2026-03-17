import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { WalletBalanceSnapshotRepository } from '../repositories/wallet-balance-snapshot.repo';

/**
 * Balance Service
 *
 * Provides shared balance operations used by multiple handlers
 * - Credit balance (add funds)
 * - Debit balance (subtract funds)
 * - Get current balance
 *
 * This service is used by:
 * - MissionRewardHandler
 * - ClaimPayoutHandler (future)
 * - WithdrawalHandler (future)
 * - etc.
 */
@Injectable()
export class BalanceService {
  constructor(
    private readonly balanceSnapshotRepo: WalletBalanceSnapshotRepository,
  ) {}

  /**
   * Credit wallet balance (add funds)
   *
   * Increments available_amount and total_amount
   *
   * @param wallet_id - Wallet ID
   * @param amount - Amount to add (string for precision)
   * @param queryRunner - Transaction context
   * @returns Updated total balance
   */
  async creditBalance(
    wallet_id: number,
    amount: string,
    queryRunner: QueryRunner,
  ): Promise<string> {
    // Increment available balance
    await this.balanceSnapshotRepo.incrementAvailable(
      wallet_id,
      amount,
      queryRunner,
    );

    // Fetch and return updated balance
    const balance = await this.balanceSnapshotRepo.findByWalletId(
      wallet_id,
      queryRunner,
    );

    return balance?.total_amount || '0.00';
  }

  /**
   * Debit wallet balance (subtract funds)
   *
   * Decrements available_amount and total_amount
   *
   * @param wallet_id - Wallet ID
   * @param amount - Amount to subtract (string for precision)
   * @param queryRunner - Transaction context
   * @returns Updated total balance
   */
  async debitBalance(
    wallet_id: number,
    amount: string,
    queryRunner: QueryRunner,
  ): Promise<string> {
    // Decrement available balance
    await this.balanceSnapshotRepo.decrementAvailable(
      wallet_id,
      amount,
      queryRunner,
    );

    // Fetch and return updated balance
    const balance = await this.balanceSnapshotRepo.findByWalletId(
      wallet_id,
      queryRunner,
    );

    return balance?.total_amount || '0.00';
  }

  /**
   * Get current balance for a wallet
   *
   * @param wallet_id - Wallet ID
   * @param queryRunner - Transaction context
   * @returns Balance snapshot
   */
  async getBalance(
    wallet_id: number,
    queryRunner: QueryRunner,
  ): Promise<any | null> {
    return await this.balanceSnapshotRepo.findByWalletId(wallet_id, queryRunner);
  }

  /**
   * Hold funds (move from available to held)
   *
   * Future use: pending withdrawals, escrow, etc.
   *
   * @param wallet_id - Wallet ID
   * @param amount - Amount to hold
   * @param queryRunner - Transaction context
   * @returns Updated balance
   */
  async holdFunds(
    wallet_id: number,
    amount: string,
    queryRunner: QueryRunner,
  ): Promise<string> {
    // This would move funds from available to held
    // Implementation depends on your balance snapshot repository methods
    // For now, just a placeholder

    await queryRunner.manager.query(
      `
      UPDATE wallet_balance_snapshot
      SET available_amount = available_amount - ?,
          held_amount = held_amount + ?
      WHERE wallet_id = ?
      `,
      [amount, amount, wallet_id],
    );

    const balance = await this.balanceSnapshotRepo.findByWalletId(
      wallet_id,
      queryRunner,
    );

    return balance?.total_amount || '0.00';
  }

  /**
   * Release held funds (move from held to available)
   *
   * Future use: completing withdrawals, releasing escrow, etc.
   *
   * @param wallet_id - Wallet ID
   * @param amount - Amount to release
   * @param queryRunner - Transaction context
   * @returns Updated balance
   */
  async releaseFunds(
    wallet_id: number,
    amount: string,
    queryRunner: QueryRunner,
  ): Promise<string> {
    await queryRunner.manager.query(
      `
      UPDATE wallet_balance_snapshot
      SET available_amount = available_amount + ?,
          held_amount = held_amount - ?
      WHERE wallet_id = ?
      `,
      [amount, amount, wallet_id],
    );

    const balance = await this.balanceSnapshotRepo.findByWalletId(
      wallet_id,
      queryRunner,
    );

    return balance?.total_amount || '0.00';
  }
}
