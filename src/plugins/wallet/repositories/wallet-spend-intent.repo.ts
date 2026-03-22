import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { WalletSpendIntent } from '../entities/wallet-spend-intent.entity';

@Injectable()
export class WalletSpendIntentRepository {
  constructor(
    @InjectRepository(WalletSpendIntent)
    private readonly repo: Repository<WalletSpendIntent>,
  ) {}

  async insert(
    data: Partial<WalletSpendIntent>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(WalletSpendIntent)
      : this.repo;
    const result = await repo
      .createQueryBuilder()
      .insert()
      .into(WalletSpendIntent)
      .values(data)
      .orIgnore()
      .execute();
    return Number(result.identifiers[0]?.id ?? result.raw?.insertId);
  }

  async findByIdempotencyKey(
    idempotencyKey: string,
    queryRunner?: QueryRunner,
  ): Promise<WalletSpendIntent | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(WalletSpendIntent, { where: { idempotency_key: idempotencyKey } });
  }

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<WalletSpendIntent | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(WalletSpendIntent, { where: { id } });
  }

  async update(
    id: number,
    data: Partial<WalletSpendIntent>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(WalletSpendIntent, { id }, data);
  }
}
