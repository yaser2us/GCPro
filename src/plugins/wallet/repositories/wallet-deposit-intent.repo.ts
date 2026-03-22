import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { WalletDepositIntent } from '../entities/wallet-deposit-intent.entity';

@Injectable()
export class WalletDepositIntentRepository {
  constructor(
    @InjectRepository(WalletDepositIntent)
    private readonly repo: Repository<WalletDepositIntent>,
  ) {}

  async insert(
    data: Partial<WalletDepositIntent>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(WalletDepositIntent)
      : this.repo;
    const result = await repo
      .createQueryBuilder()
      .insert()
      .into(WalletDepositIntent)
      .values(data)
      .orIgnore()
      .execute();
    return Number(result.identifiers[0]?.id ?? result.raw?.insertId);
  }

  async findByIdempotencyKey(
    idempotencyKey: string,
    queryRunner?: QueryRunner,
  ): Promise<WalletDepositIntent | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(WalletDepositIntent, { where: { idempotency_key: idempotencyKey } });
  }

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<WalletDepositIntent | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(WalletDepositIntent, { where: { id } });
  }

  async update(
    id: number,
    data: Partial<WalletDepositIntent>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(WalletDepositIntent, { id }, data);
  }
}
