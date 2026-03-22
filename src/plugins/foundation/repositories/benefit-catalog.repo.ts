import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { BenefitCatalog } from '../entities/benefit-catalog.entity';

@Injectable()
export class BenefitCatalogRepository {
  constructor(
    @InjectRepository(BenefitCatalog)
    private readonly repository: Repository<BenefitCatalog>,
  ) {}

  async create(data: Partial<BenefitCatalog>, queryRunner?: QueryRunner): Promise<number> {
    const repo = queryRunner ? queryRunner.manager.getRepository(BenefitCatalog) : this.repository;
    const result = await repo.insert(data);
    return Number(result.identifiers[0].id);
  }

  async findById(id: number, queryRunner?: QueryRunner): Promise<BenefitCatalog | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(BenefitCatalog) : this.repository;
    return repo.findOne({ where: { id } });
  }

  async update(id: number, data: Partial<BenefitCatalog>, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(BenefitCatalog) : this.repository;
    await repo.update(id, data);
  }

  async findByCodeAndVersion(code: string, version: string, queryRunner?: QueryRunner): Promise<BenefitCatalog | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(BenefitCatalog) : this.repository;
    return repo.findOne({ where: { code, version } });
  }

  async findByStatus(status: string, queryRunner?: QueryRunner): Promise<BenefitCatalog[]> {
    const repo = queryRunner ? queryRunner.manager.getRepository(BenefitCatalog) : this.repository;
    return repo.find({ where: { status }, order: { created_at: 'DESC' } });
  }
}
