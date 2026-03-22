import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { CrowdPeriodClaim } from '../entities/crowd-period-claim.entity';

/**
 * CrowdPeriodClaimRepository
 * Repository for crowd_period_claim table
 */
@Injectable()
export class CrowdPeriodClaimRepository {
  constructor(
    @InjectRepository(CrowdPeriodClaim)
    private readonly repository: Repository<CrowdPeriodClaim>,
  ) {}

  async create(data: Partial<CrowdPeriodClaim>, queryRunner?: QueryRunner): Promise<number> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CrowdPeriodClaim) : this.repository;
    const result = await repo.insert(data);
    return Number(result.identifiers[0].id);
  }

  async findById(id: number, queryRunner?: QueryRunner): Promise<CrowdPeriodClaim | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CrowdPeriodClaim) : this.repository;
    return repo.findOne({ where: { id } });
  }

  async update(id: number, data: Partial<CrowdPeriodClaim>, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CrowdPeriodClaim) : this.repository;
    await repo.update(id, data);
  }

  async findByPeriodId(crowdPeriodId: number, queryRunner?: QueryRunner): Promise<CrowdPeriodClaim[]> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CrowdPeriodClaim) : this.repository;
    return repo.find({ where: { crowd_period_id: crowdPeriodId } });
  }
}
