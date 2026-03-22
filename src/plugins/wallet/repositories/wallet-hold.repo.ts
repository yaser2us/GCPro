import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { WalletHold } from '../entities/wallet-hold.entity';

@Injectable()
export class WalletHoldRepository {
  constructor(
    @InjectRepository(WalletHold)
    private readonly repo: Repository<WalletHold>,
  ) {}

  async insert(
    data: Partial<WalletHold>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(WalletHold)
      : this.repo;
    const result = await repo
      .createQueryBuilder()
      .insert()
      .into(WalletHold)
      .values(data)
      .orIgnore()
      .execute();
    return Number(result.identifiers[0]?.id ?? result.raw?.insertId);
  }

  async findByIdempotencyKey(
    idempotencyKey: string,
    queryRunner?: QueryRunner,
  ): Promise<WalletHold | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(WalletHold, { where: { idempotency_key: idempotencyKey } });
  }

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<WalletHold | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(WalletHold, { where: { id } });
  }

  async update(
    id: number,
    data: Partial<WalletHold>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(WalletHold, { id }, data);
  }
}
