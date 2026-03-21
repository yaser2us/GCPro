import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { PolicyBenefitUsageEvent } from '../entities/policy-benefit-usage-event.entity';

/**
 * PolicyBenefitUsageEventRepository
 * Handles database operations for policy_benefit_usage_event table
 * Source: specs/policy/policy.pillar.v2.yml
 */
@Injectable()
export class PolicyBenefitUsageEventRepository {
  constructor(
    @InjectRepository(PolicyBenefitUsageEvent)
    private readonly repo: Repository<PolicyBenefitUsageEvent>,
  ) {}

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<PolicyBenefitUsageEvent | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(PolicyBenefitUsageEvent, { where: { id } });
  }

  async create(
    data: Partial<PolicyBenefitUsageEvent>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(PolicyBenefitUsageEvent, data);
    return result.identifiers[0].id;
  }

  async upsert(
    data: Partial<PolicyBenefitUsageEvent>,
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
      .filter((k) => k !== 'idempotency_key')
      .map((k) => `${k}=VALUES(${k})`)
      .join(', ');

    const sql = `
      INSERT INTO policy_benefit_usage_event (${fieldList})
      VALUES (${valueList})
      ON DUPLICATE KEY UPDATE
        id = LAST_INSERT_ID(id)${updateList ? ', ' + updateList : ''}
    `;

    const result = await manager.query(sql);
    return result.insertId;
  }
}
