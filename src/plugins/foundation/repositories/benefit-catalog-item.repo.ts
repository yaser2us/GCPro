import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { BenefitCatalogItem } from '../entities/benefit-catalog-item.entity';

@Injectable()
export class BenefitCatalogItemRepository {
  constructor(
    @InjectRepository(BenefitCatalogItem)
    private readonly repository: Repository<BenefitCatalogItem>,
  ) {}

  async create(data: Partial<BenefitCatalogItem>, queryRunner?: QueryRunner): Promise<number> {
    const repo = queryRunner ? queryRunner.manager.getRepository(BenefitCatalogItem) : this.repository;
    const result = await repo.insert(data);
    return Number(result.identifiers[0].id);
  }

  async findById(id: number, queryRunner?: QueryRunner): Promise<BenefitCatalogItem | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(BenefitCatalogItem) : this.repository;
    return repo.findOne({ where: { id } });
  }

  async findByCatalogAndCode(catalogId: number, itemCode: string, queryRunner?: QueryRunner): Promise<BenefitCatalogItem | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(BenefitCatalogItem) : this.repository;
    return repo.findOne({ where: { catalog_id: catalogId, item_code: itemCode } });
  }

  async findByCatalog(catalogId: number, queryRunner?: QueryRunner): Promise<BenefitCatalogItem[]> {
    const repo = queryRunner ? queryRunner.manager.getRepository(BenefitCatalogItem) : this.repository;
    return repo.find({ where: { catalog_id: catalogId }, order: { created_at: 'ASC' } });
  }
}
