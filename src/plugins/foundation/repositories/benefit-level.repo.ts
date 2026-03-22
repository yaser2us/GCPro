import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { BenefitLevel } from '../entities/benefit-level.entity';

@Injectable()
export class BenefitLevelRepository {
  constructor(
    @InjectRepository(BenefitLevel)
    private readonly repository: Repository<BenefitLevel>,
  ) {}

  async create(data: Partial<BenefitLevel>, queryRunner?: QueryRunner): Promise<number> {
    const repo = queryRunner ? queryRunner.manager.getRepository(BenefitLevel) : this.repository;
    const result = await repo.insert(data);
    return Number(result.identifiers[0].id);
  }

  async findById(id: number, queryRunner?: QueryRunner): Promise<BenefitLevel | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(BenefitLevel) : this.repository;
    return repo.findOne({ where: { id } });
  }

  async findByCatalogAndCode(catalogId: number, levelCode: string, queryRunner?: QueryRunner): Promise<BenefitLevel | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(BenefitLevel) : this.repository;
    return repo.findOne({ where: { catalog_id: catalogId, level_code: levelCode } });
  }

  async findByCatalog(catalogId: number, queryRunner?: QueryRunner): Promise<BenefitLevel[]> {
    const repo = queryRunner ? queryRunner.manager.getRepository(BenefitLevel) : this.repository;
    return repo.find({ where: { catalog_id: catalogId }, order: { sort_order: 'ASC' } });
  }
}
