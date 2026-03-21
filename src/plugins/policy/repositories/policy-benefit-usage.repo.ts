import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { PolicyBenefitUsage } from '../entities/policy-benefit-usage.entity';

/**
 * PolicyBenefitUsageRepository
 * Handles database operations for policy_benefit_usage table
 * Source: specs/policy/policy.pillar.v2.yml
 */
@Injectable()
export class PolicyBenefitUsageRepository {
  constructor(
    @InjectRepository(PolicyBenefitUsage)
    private readonly repo: Repository<PolicyBenefitUsage>,
  ) {}

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<PolicyBenefitUsage | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(PolicyBenefitUsage, { where: { id } });
  }

  async findByPolicyPeriodItem(
    policyId: number,
    periodKey: string,
    itemCode: string,
    queryRunner?: QueryRunner,
  ): Promise<PolicyBenefitUsage | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(PolicyBenefitUsage, {
      where: {
        policy_id: policyId,
        period_key: periodKey,
        item_code: itemCode
      }
    });
  }

  async create(
    data: Partial<PolicyBenefitUsage>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(PolicyBenefitUsage, data);
    return result.identifiers[0].id;
  }

  async update(
    id: number,
    data: Partial<PolicyBenefitUsage>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(PolicyBenefitUsage, { id }, data);
  }

  async upsert(
    data: Partial<PolicyBenefitUsage>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    const fields = Object.keys(data).filter((k) => k !== 'id' && data[k] !== undefined);
    const values = fields.map((k) => {
      const value = data[k];
      if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
      if (value === null) return 'NULL';
      if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
      if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
      return String(value);
    });

    const fieldList = fields.join(', ');
    const valueList = values.join(', ');
    const updateList = fields
      .filter((k) => !['policy_id', 'period_key', 'item_code'].includes(k))
      .map((k) => `${k}=VALUES(${k})`)
      .join(', ');

    const sql = `
      INSERT INTO policy_benefit_usage (${fieldList})
      VALUES (${valueList})
      ON DUPLICATE KEY UPDATE
        id = LAST_INSERT_ID(id)${updateList ? ', ' + updateList : ''}
    `;

    const result = await manager.query(sql);
    return result.insertId;
  }
}
