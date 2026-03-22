import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { MedicalCaseEvent } from '../entities/medical-case-event.entity';

/**
 * MedicalCaseEventRepository
 * Handles database operations for medical_case_event table
 * Source: specs/claim/claim.pillar.v2.yml resources.medical_case_event
 */
@Injectable()
export class MedicalCaseEventRepository {
  constructor(
    @InjectRepository(MedicalCaseEvent)
    private readonly repo: Repository<MedicalCaseEvent>,
  ) {}

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<MedicalCaseEvent | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(MedicalCaseEvent, { where: { id } });
  }

  async create(
    data: Partial<MedicalCaseEvent>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(MedicalCaseEvent, data);
    return result.identifiers[0].id;
  }
}
