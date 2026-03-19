import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { CommissionParticipant } from '../entities/commission-participant.entity';

/**
 * CommissionParticipantRepository
 * Handles database operations for commission_participant table
 */
@Injectable()
export class CommissionParticipantRepository {
  constructor(
    @InjectRepository(CommissionParticipant)
    private readonly repo: Repository<CommissionParticipant>,
  ) {}

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<CommissionParticipant | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(CommissionParticipant, { where: { id } });
  }

  async update(
    id: number,
    data: Partial<CommissionParticipant>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(CommissionParticipant, { id }, data);
  }

  async upsert(
    data: Partial<CommissionParticipant>,
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
      .filter((k) => !['program_id', 'participant_type', 'participant_id'].includes(k))
      .map((k) => `${k}=VALUES(${k})`)
      .join(', ');

    const sql = `
      INSERT INTO commission_participant (${fieldList})
      VALUES (${valueList})
      ON DUPLICATE KEY UPDATE
        id = LAST_INSERT_ID(id)${updateList ? ', ' + updateList : ''}
    `;

    const result = await manager.query(sql);
    return result.insertId;
  }
}
