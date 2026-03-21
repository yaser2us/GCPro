import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { Policy } from '../entities/policy.entity';

/**
 * PolicyRepository
 * Handles database operations for policy table
 * Source: specs/policy/policy.pillar.v2.yml aggregates.POLICY
 */
@Injectable()
export class PolicyRepository {
  constructor(
    @InjectRepository(Policy)
    private readonly repo: Repository<Policy>,
  ) {}

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<Policy | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(Policy, { where: { id } });
  }

  async findByPolicyNumber(
    policyNumber: string,
    queryRunner?: QueryRunner,
  ): Promise<Policy | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(Policy, { where: { policy_number: policyNumber } });
  }

  async create(
    data: Partial<Policy>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(Policy, data);
    return result.identifiers[0].id;
  }

  async update(
    id: number,
    data: Partial<Policy>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(Policy, { id }, data);
  }

  async upsert(
    data: Partial<Policy>,
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
      .filter((k) => k !== 'policy_number')
      .map((k) => `${k}=VALUES(${k})`)
      .join(', ');

    const sql = `
      INSERT INTO policy (${fieldList})
      VALUES (${valueList})
      ON DUPLICATE KEY UPDATE
        id = LAST_INSERT_ID(id)${updateList ? ', ' + updateList : ''}
    `;

    const result = await manager.query(sql);
    return result.insertId;
  }
}
