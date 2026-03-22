import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { MedicalUnderwritingOutcome } from '../entities/medical-underwriting-outcome.entity';

/**
 * MedicalUnderwritingOutcomeRepository
 * Handles database operations for medical_underwriting_outcome table
 * Source: specs/claim/claim.pillar.v2.yml resources.medical_underwriting_outcome
 */
@Injectable()
export class MedicalUnderwritingOutcomeRepository {
  constructor(
    @InjectRepository(MedicalUnderwritingOutcome)
    private readonly repo: Repository<MedicalUnderwritingOutcome>,
  ) {}

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<MedicalUnderwritingOutcome | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(MedicalUnderwritingOutcome, { where: { id } });
  }

  async findByCaseIdAndVersion(
    caseId: number,
    versionNo: number,
    queryRunner?: QueryRunner,
  ): Promise<MedicalUnderwritingOutcome | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(MedicalUnderwritingOutcome, {
      where: { case_id: caseId, version_no: versionNo }
    });
  }

  async create(
    data: Partial<MedicalUnderwritingOutcome>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(MedicalUnderwritingOutcome, data);
    return result.identifiers[0].id;
  }

  async update(
    id: number,
    data: Partial<MedicalUnderwritingOutcome>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(MedicalUnderwritingOutcome, { id }, data);
  }
}
