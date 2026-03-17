import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { Wallet } from '../entities/wallet.entity';

/**
 * WalletRepository
 * Handles database operations for wallet table
 *
 * Based on: specs/wallet/wallet.pillar.v2.yml
 */
@Injectable()
export class WalletRepository {
  constructor(
    @InjectRepository(Wallet)
    private readonly repo: Repository<Wallet>,
  ) {}

  /**
   * Find wallet by ID
   */
  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<Wallet | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(Wallet, {
      where: { id },
      relations: ['balance_snapshot'],
    });
  }

  /**
   * Find wallet by account, currency, and wallet type
   */
  async findByAccountAndCurrency(
    accountId: number,
    currency: string,
    walletType: string = 'MAIN',
    queryRunner?: QueryRunner,
  ): Promise<Wallet | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(Wallet, {
      where: {
        account_id: accountId,
        currency,
        wallet_type: walletType,
      },
      relations: ['balance_snapshot'],
    });
  }

  /**
   * Create wallet (with ON DUPLICATE KEY UPDATE for idempotency)
   */
  async createOrGet(
    data: Partial<Wallet>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    // Use raw query for ON DUPLICATE KEY UPDATE
    const result = await manager.query(
      `
      INSERT INTO wallet (account_id, wallet_type, currency, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)
      `,
      [
        data.account_id,
        data.wallet_type || 'MAIN',
        data.currency || 'COIN',
        data.status || 'active',
      ],
    );

    return result.insertId;
  }

  /**
   * Update wallet
   */
  async update(
    id: number,
    data: Partial<Wallet>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(Wallet, { id }, data);
  }

  /**
   * List wallets by account
   */
  async listByAccount(
    accountId: number,
    queryRunner?: QueryRunner,
  ): Promise<Wallet[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(Wallet, {
      where: { account_id: accountId },
      relations: ['balance_snapshot'],
    });
  }
}
