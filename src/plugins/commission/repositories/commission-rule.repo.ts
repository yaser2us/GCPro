import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { CommissionRule } from '../entities/commission-rule.entity';

/**
 * CommissionRuleRepository
 * Handles database operations for commission_rule table
 */
@Injectable()
export class CommissionRuleRepository {
  constructor(
    @InjectRepository(CommissionRule)
    private readonly repo: Repository<CommissionRule>,
  ) {}

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<CommissionRule | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(CommissionRule, { where: { id } });
  }

  async update(
    id: number,
    data: Partial<CommissionRule>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(CommissionRule, { id }, data);
  }

  async upsert(
    data: Partial<CommissionRule>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    // Filter out undefined values and the 'id' field
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
      .filter((k) => !['program_id', 'code'].includes(k))
      .map((k) => `${k}=VALUES(${k})`)
      .join(', ');

    const sql = `
      INSERT INTO commission_rule (${fieldList})
      VALUES (${valueList})
      ON DUPLICATE KEY UPDATE
        id = LAST_INSERT_ID(id)${updateList ? ', ' + updateList : ''}
    `;

    const result = await manager.query(sql);
    return result.insertId;
  }
}
