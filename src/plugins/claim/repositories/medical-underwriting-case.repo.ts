import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { MedicalUnderwritingCase } from '../entities/medical-underwriting-case.entity';

/**
 * MedicalUnderwritingCaseRepository
 * Handles database operations for medical_underwriting_case table
 * Source: specs/claim/claim.pillar.v2.yml aggregates.MEDICAL_UNDERWRITING_CASE
 */
@Injectable()
export class MedicalUnderwritingCaseRepository {
  constructor(
    @InjectRepository(MedicalUnderwritingCase)
    private readonly repo: Repository<MedicalUnderwritingCase>,
  ) {}

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<MedicalUnderwritingCase | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(MedicalUnderwritingCase, { where: { id } });
  }

  async findByCaseNo(
    caseNo: string,
    queryRunner?: QueryRunner,
  ): Promise<MedicalUnderwritingCase | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(MedicalUnderwritingCase, { where: { case_no: caseNo } });
  }

  async create(
    data: Partial<MedicalUnderwritingCase>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(MedicalUnderwritingCase, data);
    return result.identifiers[0].id;
  }

  async update(
    id: number,
    data: Partial<MedicalUnderwritingCase>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(MedicalUnderwritingCase, { id }, data);
  }

  async upsert(
    data: Partial<MedicalUnderwritingCase>,
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
      .filter((k) => k !== 'case_no')
      .map((k) => `${k}=VALUES(${k})`)
      .join(', ');

    const sql = `
      INSERT INTO medical_underwriting_case (${fieldList})
      VALUES (${valueList})
      ON DUPLICATE KEY UPDATE
        id = LAST_INSERT_ID(id)${updateList ? ', ' + updateList : ''}
    `;

    const result = await manager.query(sql);
    return result.insertId;
  }
}
