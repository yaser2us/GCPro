import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { MedicalUnderwritingEvidence } from '../entities/medical-underwriting-evidence.entity';

/**
 * MedicalUnderwritingEvidenceRepository
 * Handles database operations for medical_underwriting_evidence table
 * Source: specs/claim/claim.pillar.v2.yml resources.medical_underwriting_evidence
 */
@Injectable()
export class MedicalUnderwritingEvidenceRepository {
  constructor(
    @InjectRepository(MedicalUnderwritingEvidence)
    private readonly repo: Repository<MedicalUnderwritingEvidence>,
  ) {}

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<MedicalUnderwritingEvidence | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(MedicalUnderwritingEvidence, { where: { id } });
  }

  async create(
    data: Partial<MedicalUnderwritingEvidence>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(MedicalUnderwritingEvidence, data);
    return result.identifiers[0].id;
  }

  async update(
    id: number,
    data: Partial<MedicalUnderwritingEvidence>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(MedicalUnderwritingEvidence, { id }, data);
  }

  async delete(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.delete(MedicalUnderwritingEvidence, { id });
  }
}
