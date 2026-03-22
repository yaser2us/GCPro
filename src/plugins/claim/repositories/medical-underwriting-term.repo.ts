import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { MedicalUnderwritingTerm } from '../entities/medical-underwriting-term.entity';

/**
 * MedicalUnderwritingTermRepository
 * Handles database operations for medical_underwriting_term table
 * Source: specs/claim/claim.pillar.v2.yml resources.medical_underwriting_term
 */
@Injectable()
export class MedicalUnderwritingTermRepository {
  constructor(
    @InjectRepository(MedicalUnderwritingTerm)
    private readonly repo: Repository<MedicalUnderwritingTerm>,
  ) {}

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<MedicalUnderwritingTerm | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(MedicalUnderwritingTerm, { where: { id } });
  }

  async create(
    data: Partial<MedicalUnderwritingTerm>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(MedicalUnderwritingTerm, data);
    return result.identifiers[0].id;
  }

  async update(
    id: number,
    data: Partial<MedicalUnderwritingTerm>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(MedicalUnderwritingTerm, { id }, data);
  }

  async delete(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.delete(MedicalUnderwritingTerm, { id });
  }
}
