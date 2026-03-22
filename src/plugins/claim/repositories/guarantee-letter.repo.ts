import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { GuaranteeLetter } from '../entities/guarantee-letter.entity';

/**
 * GuaranteeLetterRepository
 * Handles database operations for guarantee_letter table
 * Source: specs/claim/claim.pillar.v2.yml aggregates.GUARANTEE_LETTER
 */
@Injectable()
export class GuaranteeLetterRepository {
  constructor(
    @InjectRepository(GuaranteeLetter)
    private readonly repo: Repository<GuaranteeLetter>,
  ) {}

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<GuaranteeLetter | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(GuaranteeLetter, { where: { id } });
  }

  async findByGlNumber(
    glNumber: string,
    queryRunner?: QueryRunner,
  ): Promise<GuaranteeLetter | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(GuaranteeLetter, { where: { gl_number: glNumber } });
  }

  async findByMedicalCaseId(
    medicalCaseId: number,
    queryRunner?: QueryRunner,
  ): Promise<GuaranteeLetter | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(GuaranteeLetter, { where: { medical_case_id: medicalCaseId } });
  }

  async create(
    data: Partial<GuaranteeLetter>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(GuaranteeLetter, data);
    return result.identifiers[0].id;
  }

  async update(
    id: number,
    data: Partial<GuaranteeLetter>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(GuaranteeLetter, { id }, data);
  }
}
