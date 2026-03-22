import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner, IsNull } from 'typeorm';
import { MedicalUnderwritingCurrentOutcome } from '../entities/medical-underwriting-current-outcome.entity';

/**
 * MedicalUnderwritingCurrentOutcomeRepository
 * Handles database operations for medical_underwriting_current_outcome table
 * Source: specs/claim/claim.pillar.v2.yml resources.medical_underwriting_current_outcome
 */
@Injectable()
export class MedicalUnderwritingCurrentOutcomeRepository {
  constructor(
    @InjectRepository(MedicalUnderwritingCurrentOutcome)
    private readonly repo: Repository<MedicalUnderwritingCurrentOutcome>,
  ) {}

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<MedicalUnderwritingCurrentOutcome | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(MedicalUnderwritingCurrentOutcome, { where: { id } });
  }

  async findBySubjectAndContext(
    subjectRefId: number,
    contextRefId: number | null,
    queryRunner?: QueryRunner,
  ): Promise<MedicalUnderwritingCurrentOutcome | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(MedicalUnderwritingCurrentOutcome, {
      where: {
        subject_ref_id: subjectRefId,
        context_ref_id: contextRefId === null ? IsNull() : contextRefId
      }
    });
  }

  async create(
    data: Partial<MedicalUnderwritingCurrentOutcome>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(MedicalUnderwritingCurrentOutcome, data);
    return result.identifiers[0].id;
  }

  async update(
    id: number,
    data: Partial<MedicalUnderwritingCurrentOutcome>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(MedicalUnderwritingCurrentOutcome, { id }, data);
  }

  async upsert(
    data: Partial<MedicalUnderwritingCurrentOutcome>,
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
      .filter((k) => k !== 'subject_ref_id' && k !== 'context_ref_id')
      .map((k) => `${k}=VALUES(${k})`)
      .join(', ');

    const sql = `
      INSERT INTO medical_underwriting_current_outcome (${fieldList})
      VALUES (${valueList})
      ON DUPLICATE KEY UPDATE
        id = LAST_INSERT_ID(id)${updateList ? ', ' + updateList : ''}
    `;

    const result = await manager.query(sql);
    return result.insertId;
  }
}
