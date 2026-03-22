import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { WalletBatch } from '../entities/wallet-batch.entity';

@Injectable()
export class WalletBatchRepository {
  constructor(
    @InjectRepository(WalletBatch)
    private readonly repo: Repository<WalletBatch>,
  ) {}

  async insert(
    data: Partial<WalletBatch>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(WalletBatch)
      : this.repo;
    const result = await repo
      .createQueryBuilder()
      .insert()
      .into(WalletBatch)
      .values(data)
      .orIgnore()
      .execute();
    return Number(result.identifiers[0]?.id ?? result.raw?.insertId);
  }

  async findByIdempotencyKey(
    idempotencyKey: string,
    queryRunner?: QueryRunner,
  ): Promise<WalletBatch | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(WalletBatch, { where: { idempotency_key: idempotencyKey } });
  }

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<WalletBatch | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(WalletBatch, { where: { id } });
  }

  async update(
    id: number,
    data: Partial<WalletBatch>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(WalletBatch, { id }, data);
  }
}
