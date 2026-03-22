import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { CrowdPeriodEvent } from '../entities/crowd-period-event.entity';

/**
 * CrowdPeriodEventRepository
 * Repository for crowd_period_event table (append-only)
 */
@Injectable()
export class CrowdPeriodEventRepository {
  constructor(
    @InjectRepository(CrowdPeriodEvent)
    private readonly repository: Repository<CrowdPeriodEvent>,
  ) {}

  async create(data: Partial<CrowdPeriodEvent>, queryRunner?: QueryRunner): Promise<number> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CrowdPeriodEvent) : this.repository;
    const result = await repo.insert(data);
    return Number(result.identifiers[0].id);
  }

  async findById(id: number, queryRunner?: QueryRunner): Promise<CrowdPeriodEvent | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CrowdPeriodEvent) : this.repository;
    return repo.findOne({ where: { id } });
  }

  async findByPeriodId(crowdPeriodId: number, queryRunner?: QueryRunner): Promise<CrowdPeriodEvent[]> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CrowdPeriodEvent) : this.repository;
    return repo.find({
      where: { crowd_period_id: crowdPeriodId },
      order: { created_at: 'ASC' },
    });
  }
}
