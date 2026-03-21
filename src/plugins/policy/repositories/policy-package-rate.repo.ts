import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { PolicyPackageRate } from '../entities/policy-package-rate.entity';

/**
 * PolicyPackageRateRepository
 * Handles database operations for policy_package_rate table
 * Source: specs/policy/policy.pillar.v2.yml
 */
@Injectable()
export class PolicyPackageRateRepository {
  constructor(
    @InjectRepository(PolicyPackageRate)
    private readonly repo: Repository<PolicyPackageRate>,
  ) {}

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<PolicyPackageRate | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(PolicyPackageRate, { where: { id } });
  }

  async findByPackageId(
    packageId: number,
    queryRunner?: QueryRunner,
  ): Promise<PolicyPackageRate[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(PolicyPackageRate, { where: { package_id: packageId } });
  }

  async create(
    data: Partial<PolicyPackageRate>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(PolicyPackageRate, data);
    return result.identifiers[0].id;
  }

  async update(
    id: number,
    data: Partial<PolicyPackageRate>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(PolicyPackageRate, { id }, data);
  }
}
