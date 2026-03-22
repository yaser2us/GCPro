import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { DeviceToken } from '../entities/device-token.entity';

@Injectable()
export class DeviceTokenRepository {
  constructor(
    @InjectRepository(DeviceToken)
    private readonly repo: Repository<DeviceToken>,
  ) {}

  async findByPlatformAndToken(
    platform: string,
    token: string,
    queryRunner?: QueryRunner,
  ): Promise<DeviceToken | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(DeviceToken, { where: { platform, token } });
  }

  async upsert(
    data: Partial<DeviceToken>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(DeviceToken)
      : this.repo;
    const result = await repo
      .createQueryBuilder()
      .insert()
      .into(DeviceToken)
      .values(data)
      .orUpdate(['user_id', 'status', 'last_seen_at'], ['platform', 'token'])
      .execute();
    return Number(result.identifiers[0]?.id ?? result.raw?.insertId);
  }

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<DeviceToken | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(DeviceToken, { where: { id } });
  }

  async update(
    id: number,
    data: Partial<DeviceToken>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(DeviceToken, { id }, data);
  }
}
