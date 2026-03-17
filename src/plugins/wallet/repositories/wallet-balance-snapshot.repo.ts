import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { WalletBalanceSnapshot } from '../entities/wallet-balance-snapshot.entity';

/**
 * WalletBalanceSnapshotRepository
 * Handles database operations for wallet_balance_snapshot table
 *
 * Based on: specs/wallet/wallet.pillar.v2.yml
 */
@Injectable()
export class WalletBalanceSnapshotRepository {
  constructor(
    @InjectRepository(WalletBalanceSnapshot)
    private readonly repo: Repository<WalletBalanceSnapshot>,
  ) {}

  /**
   * Find balance snapshot by wallet ID
   */
  async findByWalletId(
    walletId: number,
    queryRunner?: QueryRunner,
  ): Promise<WalletBalanceSnapshot | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(WalletBalanceSnapshot, {
      where: { wallet_id: walletId },
    });
  }

  /**
   * Create or update balance snapshot
   * Uses INSERT ... ON DUPLICATE KEY UPDATE for idempotency
   */
  async upsert(
    data: Partial<WalletBalanceSnapshot>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    await manager.query(
      `
      INSERT INTO wallet_balance_snapshot (
        wallet_id,
        available_amount,
        held_amount,
        total_amount,
        as_of
      )
      VALUES (?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        available_amount = VALUES(available_amount),
        held_amount = VALUES(held_amount),
        total_amount = VALUES(total_amount),
        as_of = NOW()
      `,
      [
        data.wallet_id,
        data.available_amount || '0.00',
        data.held_amount || '0.00',
        data.total_amount || '0.00',
      ],
    );
  }

  /**
   * Update balance amounts (used for deposits/withdrawals)
   */
  async updateBalance(
    walletId: number,
    availableAmount: string,
    heldAmount: string,
    totalAmount: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    await manager.query(
      `
      UPDATE wallet_balance_snapshot
      SET
        available_amount = ?,
        held_amount = ?,
        total_amount = ?,
        as_of = NOW()
      WHERE wallet_id = ?
      `,
      [availableAmount, heldAmount, totalAmount, walletId],
    );
  }

  /**
   * Increment available balance (for deposits)
   */
  async incrementAvailable(
    walletId: number,
    amount: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    await manager.query(
      `
      UPDATE wallet_balance_snapshot
      SET
        available_amount = available_amount + ?,
        total_amount = total_amount + ?,
        as_of = NOW()
      WHERE wallet_id = ?
      `,
      [amount, amount, walletId],
    );
  }

  /**
   * Decrement available balance (for withdrawals)
   */
  async decrementAvailable(
    walletId: number,
    amount: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    await manager.query(
      `
      UPDATE wallet_balance_snapshot
      SET
        available_amount = available_amount - ?,
        total_amount = total_amount - ?,
        as_of = NOW()
      WHERE wallet_id = ?
      `,
      [amount, amount, walletId],
    );
  }
}
