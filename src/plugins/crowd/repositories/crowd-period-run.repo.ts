import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { CrowdPeriodRun } from '../entities/crowd-period-run.entity';

/**
 * CrowdPeriodRunRepository
 * Repository for crowd_period_run table
 */
@Injectable()
export class CrowdPeriodRunRepository {
  constructor(
    @InjectRepository(CrowdPeriodRun)
    private readonly repository: Repository<CrowdPeriodRun>,
  ) {}

  async create(data: Partial<CrowdPeriodRun>, queryRunner?: QueryRunner): Promise<number> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CrowdPeriodRun) : this.repository;
    const result = await repo.insert(data);
    return Number(result.identifiers[0].id);
  }

  async findById(id: number, queryRunner?: QueryRunner): Promise<CrowdPeriodRun | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CrowdPeriodRun) : this.repository;
    return repo.findOne({ where: { id } });
  }

  async update(id: number, data: Partial<CrowdPeriodRun>, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CrowdPeriodRun) : this.repository;
    await repo.update(id, data);
  }

  async findByPeriodId(crowdPeriodId: number, queryRunner?: QueryRunner): Promise<CrowdPeriodRun[]> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CrowdPeriodRun) : this.repository;
    return repo.find({
      where: { crowd_period_id: crowdPeriodId },
      order: { started_at: 'DESC' },
    });
  }
}
