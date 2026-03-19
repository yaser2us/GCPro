import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { CommissionAccrual } from '../entities/commission-accrual.entity';

/**
 * CommissionAccrualRepository
 * Handles database operations for commission_accrual table
 */
@Injectable()
export class CommissionAccrualRepository {
  constructor(
    @InjectRepository(CommissionAccrual)
    private readonly repo: Repository<CommissionAccrual>,
  ) {}

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<CommissionAccrual | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(CommissionAccrual, { where: { id } });
  }

  async update(
    id: number,
    data: Partial<CommissionAccrual>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(CommissionAccrual, { id }, data);
  }

  async upsert(
    data: Partial<CommissionAccrual>,
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
      .filter((k) => k !== 'idempotency_key')
      .map((k) => `${k}=VALUES(${k})`)
      .join(', ');

    const sql = `
      INSERT INTO commission_accrual (${fieldList})
      VALUES (${valueList})
      ON DUPLICATE KEY UPDATE
        id = LAST_INSERT_ID(id)${updateList ? ', ' + updateList : ''}
    `;

    const result = await manager.query(sql);
    return result.insertId;
  }
}
