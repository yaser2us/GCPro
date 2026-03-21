import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { PolicyDiscountApplied } from '../entities/policy-discount-applied.entity';

/**
 * PolicyDiscountAppliedRepository
 * Handles database operations for policy_discount_applied table
 * Source: specs/policy/policy.pillar.v2.yml
 */
@Injectable()
export class PolicyDiscountAppliedRepository {
  constructor(
    @InjectRepository(PolicyDiscountApplied)
    private readonly repo: Repository<PolicyDiscountApplied>,
  ) {}

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<PolicyDiscountApplied | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(PolicyDiscountApplied, { where: { id } });
  }

  async findByPolicyId(
    policyId: number,
    queryRunner?: QueryRunner,
  ): Promise<PolicyDiscountApplied[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(PolicyDiscountApplied, { where: { policy_id: policyId } });
  }

  async create(
    data: Partial<PolicyDiscountApplied>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(PolicyDiscountApplied, data);
    return result.identifiers[0].id;
  }
}
