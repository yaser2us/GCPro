import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { CrowdPeriodRunLock } from '../entities/crowd-period-run-lock.entity';

/**
 * CrowdPeriodRunLockRepository
 * Repository for crowd_period_run_lock table
 */
@Injectable()
export class CrowdPeriodRunLockRepository {
  constructor(
    @InjectRepository(CrowdPeriodRunLock)
    private readonly repository: Repository<CrowdPeriodRunLock>,
  ) {}

  async create(data: Partial<CrowdPeriodRunLock>, queryRunner?: QueryRunner): Promise<number> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CrowdPeriodRunLock) : this.repository;
    const result = await repo.insert(data);
    return Number(result.identifiers[0].id);
  }

  async findById(id: number, queryRunner?: QueryRunner): Promise<CrowdPeriodRunLock | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CrowdPeriodRunLock) : this.repository;
    return repo.findOne({ where: { id } });
  }

  async update(id: number, data: Partial<CrowdPeriodRunLock>, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CrowdPeriodRunLock) : this.repository;
    await repo.update(id, data);
  }

  async findByPeriodAndKey(
    crowdPeriodId: number,
    lockKey: string,
    queryRunner?: QueryRunner,
  ): Promise<CrowdPeriodRunLock | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CrowdPeriodRunLock) : this.repository;
    return repo.findOne({ where: { crowd_period_id: crowdPeriodId, lock_key: lockKey } });
  }
}
