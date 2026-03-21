import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { PolicyBillingPlan } from '../entities/policy-billing-plan.entity';

/**
 * PolicyBillingPlanRepository
 * Handles database operations for policy_billing_plan table
 * Source: specs/policy/policy.pillar.v2.yml
 */
@Injectable()
export class PolicyBillingPlanRepository {
  constructor(
    @InjectRepository(PolicyBillingPlan)
    private readonly repo: Repository<PolicyBillingPlan>,
  ) {}

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<PolicyBillingPlan | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(PolicyBillingPlan, { where: { id } });
  }

  async findByPolicyId(
    policyId: number,
    queryRunner?: QueryRunner,
  ): Promise<PolicyBillingPlan[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(PolicyBillingPlan, { where: { policy_id: policyId } });
  }

  async create(
    data: Partial<PolicyBillingPlan>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(PolicyBillingPlan, data);
    return result.identifiers[0].id;
  }

  async update(
    id: number,
    data: Partial<PolicyBillingPlan>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(PolicyBillingPlan, { id }, data);
  }
}
