import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { WalletBatchItem } from '../entities/wallet-batch-item.entity';

@Injectable()
export class WalletBatchItemRepository {
  constructor(
    @InjectRepository(WalletBatchItem)
    private readonly repo: Repository<WalletBatchItem>,
  ) {}

  async insert(
    data: Partial<WalletBatchItem>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(WalletBatchItem)
      : this.repo;
    const result = await repo
      .createQueryBuilder()
      .insert()
      .into(WalletBatchItem)
      .values(data)
      .orIgnore()
      .execute();
    return Number(result.identifiers[0]?.id ?? result.raw?.insertId);
  }

  async findByIdempotencyKey(
    idempotencyKey: string,
    queryRunner?: QueryRunner,
  ): Promise<WalletBatchItem | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(WalletBatchItem, { where: { idempotency_key: idempotencyKey } });
  }

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<WalletBatchItem | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(WalletBatchItem, { where: { id } });
  }

  async findByIdAndBatchId(
    id: number,
    batchId: number,
    queryRunner?: QueryRunner,
  ): Promise<WalletBatchItem | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(WalletBatchItem, { where: { id, batch_id: batchId } });
  }

  async update(
    id: number,
    data: Partial<WalletBatchItem>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(WalletBatchItem, { id }, data);
  }
}
