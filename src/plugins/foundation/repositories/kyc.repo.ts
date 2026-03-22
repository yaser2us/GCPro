import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { KYC } from '../entities/kyc.entity';

@Injectable()
export class KYCRepository {
  constructor(
    @InjectRepository(KYC)
    private readonly repository: Repository<KYC>,
  ) {}

  async create(data: Partial<KYC>, queryRunner?: QueryRunner): Promise<number> {
    const repo = queryRunner ? queryRunner.manager.getRepository(KYC) : this.repository;
    const result = await repo.insert(data);
    return Number(result.identifiers[0].id);
  }

  async findById(id: number, queryRunner?: QueryRunner): Promise<KYC | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(KYC) : this.repository;
    return repo.findOne({ where: { id } });
  }

  async update(id: number, data: Partial<KYC>, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(KYC) : this.repository;
    await repo.update(id, data);
  }

  async findBySubject(subjectType: string, subjectId: number, queryRunner?: QueryRunner): Promise<KYC[]> {
    const repo = queryRunner ? queryRunner.manager.getRepository(KYC) : this.repository;
    return repo.find({ where: { subject_type: subjectType, subject_id: subjectId }, order: { created_at: 'DESC' } });
  }
}
