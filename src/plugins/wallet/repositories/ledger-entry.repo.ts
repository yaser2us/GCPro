import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { LedgerEntry } from '../entities/ledger-entry.entity';

/**
 * LedgerEntryRepository
 * Handles database operations for ledger_entry table
 *
 * Based on: specs/wallet/wallet.pillar.v2.yml
 */
@Injectable()
export class LedgerEntryRepository {
  constructor(
    @InjectRepository(LedgerEntry)
    private readonly repo: Repository<LedgerEntry>,
  ) {}

  /**
   * Find entry by ID
   */
  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<LedgerEntry | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(LedgerEntry, { where: { id } });
  }

  /**
   * Create ledger entry
   */
  async create(
    data: Partial<LedgerEntry>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(LedgerEntry, data);
    return result.identifiers[0].id;
  }

  /**
   * Create multiple ledger entries (batch insert)
   */
  async createMany(
    entries: Partial<LedgerEntry>[],
    queryRunner?: QueryRunner,
  ): Promise<number[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(LedgerEntry, entries);
    return result.identifiers.map((id) => id.id);
  }

  /**
   * List entries by transaction ID
   */
  async listByTxn(
    txnId: number,
    queryRunner?: QueryRunner,
  ): Promise<LedgerEntry[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(LedgerEntry, {
      where: { txn_id: txnId },
      order: { id: 'ASC' },
    });
  }

  /**
   * List entries by account
   */
  async listByAccount(
    accountId: number,
    limit: number = 50,
    offset: number = 0,
    queryRunner?: QueryRunner,
  ): Promise<LedgerEntry[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(LedgerEntry, {
      where: { account_id: accountId },
      order: { id: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Calculate balance for account (sum of debits - credits)
   * Note: This is for verification, not real-time balance
   */
  async calculateBalance(
    accountId: number,
    currency: string,
    queryRunner?: QueryRunner,
  ): Promise<string> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    const result = await manager.query(
      `
      SELECT
        COALESCE(
          SUM(CASE WHEN direction = 'debit' THEN amount ELSE -amount END),
          0
        ) as balance
      FROM ledger_entry
      WHERE account_id = ? AND currency = ?
      `,
      [accountId, currency],
    );

    return result[0]?.balance || '0.00';
  }
}
