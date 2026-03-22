import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { CrowdPackageBucket } from '../entities/crowd-package-bucket.entity';

/**
 * CrowdPackageBucketRepository
 * Repository for crowd_package_bucket table
 */
@Injectable()
export class CrowdPackageBucketRepository {
  constructor(
    @InjectRepository(CrowdPackageBucket)
    private readonly repository: Repository<CrowdPackageBucket>,
  ) {}

  async create(data: Partial<CrowdPackageBucket>, queryRunner?: QueryRunner): Promise<number> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CrowdPackageBucket) : this.repository;
    const result = await repo.insert(data);
    return Number(result.identifiers[0].id);
  }

  async findById(id: number, queryRunner?: QueryRunner): Promise<CrowdPackageBucket | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CrowdPackageBucket) : this.repository;
    return repo.findOne({ where: { id } });
  }

  async update(id: number, data: Partial<CrowdPackageBucket>, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CrowdPackageBucket) : this.repository;
    await repo.update(id, data);
  }

  async findByPeriodId(crowdPeriodId: number, queryRunner?: QueryRunner): Promise<CrowdPackageBucket[]> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CrowdPackageBucket) : this.repository;
    return repo.find({ where: { crowd_period_id: crowdPeriodId } });
  }
}
