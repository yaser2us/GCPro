import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { CrowdPeriod } from '../entities/crowd-period.entity';

/**
 * CrowdPeriodRepository
 * Repository for crowd_period table
 */
@Injectable()
export class CrowdPeriodRepository {
  constructor(
    @InjectRepository(CrowdPeriod)
    private readonly repository: Repository<CrowdPeriod>,
  ) {}

  async create(data: Partial<CrowdPeriod>, queryRunner?: QueryRunner): Promise<number> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CrowdPeriod) : this.repository;
    const result = await repo.insert(data);
    return Number(result.identifiers[0].id);
  }

  async findById(id: number, queryRunner?: QueryRunner): Promise<CrowdPeriod | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CrowdPeriod) : this.repository;
    return repo.findOne({ where: { id } });
  }

  async update(id: number, data: Partial<CrowdPeriod>, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CrowdPeriod) : this.repository;
    await repo.update(id, data);
  }

  async findByPeriodKey(periodKey: string, queryRunner?: QueryRunner): Promise<CrowdPeriod | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CrowdPeriod) : this.repository;
    return repo.findOne({ where: { period_key: periodKey } });
  }

  async findByStatus(status: string, queryRunner?: QueryRunner): Promise<CrowdPeriod[]> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CrowdPeriod) : this.repository;
    return repo.find({
      where: { status },
      order: { created_at: 'DESC' },
    });
  }
}
