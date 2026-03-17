import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { LedgerTxn } from '../entities/ledger-txn.entity';

/**
 * LedgerTxnRepository
 * Handles database operations for ledger_txn table
 *
 * Based on: specs/wallet/wallet.pillar.v2.yml
 */
@Injectable()
export class LedgerTxnRepository {
  constructor(
    @InjectRepository(LedgerTxn)
    private readonly repo: Repository<LedgerTxn>,
  ) {}

  /**
   * Find transaction by ID
   */
  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<LedgerTxn | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(LedgerTxn, {
      where: { id },
      relations: ['entries'],
    });
  }

  /**
   * Find transaction by idempotency key
   */
  async findByIdempotencyKey(
    idempotencyKey: string,
    queryRunner?: QueryRunner,
  ): Promise<LedgerTxn | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(LedgerTxn, {
      where: { idempotency_key: idempotencyKey },
      relations: ['entries'],
    });
  }

  /**
   * Create ledger transaction
   */
  async create(
    data: Partial<LedgerTxn>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(LedgerTxn, {
      ...data,
      occurred_at: new Date(),
    });
    return result.identifiers[0].id;
  }

  /**
   * List transactions by account
   */
  async listByAccount(
    accountId: number,
    limit: number = 50,
    offset: number = 0,
    queryRunner?: QueryRunner,
  ): Promise<LedgerTxn[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(LedgerTxn, {
      where: { account_id: accountId },
      relations: ['entries'],
      order: { occurred_at: 'DESC', id: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * List transactions by type
   */
  async listByType(
    accountId: number,
    type: string,
    limit: number = 50,
    offset: number = 0,
    queryRunner?: QueryRunner,
  ): Promise<LedgerTxn[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(LedgerTxn, {
      where: { account_id: accountId, type },
      relations: ['entries'],
      order: { occurred_at: 'DESC', id: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * List transactions by reference
   */
  async listByReference(
    refType: string,
    refId: string,
    queryRunner?: QueryRunner,
  ): Promise<LedgerTxn[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(LedgerTxn, {
      where: { ref_type: refType, ref_id: refId },
      relations: ['entries'],
      order: { occurred_at: 'DESC', id: 'DESC' },
    });
  }
}
