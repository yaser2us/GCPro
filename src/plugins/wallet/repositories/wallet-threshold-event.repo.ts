import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { WalletThresholdEvent } from '../entities/wallet-threshold-event.entity';

@Injectable()
export class WalletThresholdEventRepository {
  constructor(
    @InjectRepository(WalletThresholdEvent)
    private readonly repo: Repository<WalletThresholdEvent>,
  ) {}

  async insert(
    data: Partial<WalletThresholdEvent>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(WalletThresholdEvent)
      : this.repo;
    const result = await repo
      .createQueryBuilder()
      .insert()
      .into(WalletThresholdEvent)
      .values(data)
      .orIgnore()
      .execute();
    return Number(result.identifiers[0]?.id ?? result.raw?.insertId);
  }

  async findByIdempotencyKey(
    idempotencyKey: string,
    queryRunner?: QueryRunner,
  ): Promise<WalletThresholdEvent | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(WalletThresholdEvent, { where: { idempotency_key: idempotencyKey } });
  }

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<WalletThresholdEvent | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(WalletThresholdEvent, { where: { id } });
  }
}
