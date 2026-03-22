import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { GuidelineDocument } from '../entities/guideline-document.entity';

@Injectable()
export class GuidelineDocumentRepository {
  constructor(
    @InjectRepository(GuidelineDocument)
    private readonly repository: Repository<GuidelineDocument>,
  ) {}

  async create(data: Partial<GuidelineDocument>, queryRunner?: QueryRunner): Promise<number> {
    const repo = queryRunner ? queryRunner.manager.getRepository(GuidelineDocument) : this.repository;
    const result = await repo.insert(data);
    return Number(result.identifiers[0].id);
  }

  async findById(id: number, queryRunner?: QueryRunner): Promise<GuidelineDocument | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(GuidelineDocument) : this.repository;
    return repo.findOne({ where: { id } });
  }

  async update(id: number, data: Partial<GuidelineDocument>, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(GuidelineDocument) : this.repository;
    await repo.update(id, data);
  }

  async findByCode(code: string, queryRunner?: QueryRunner): Promise<GuidelineDocument | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(GuidelineDocument) : this.repository;
    return repo.findOne({ where: { code } });
  }
}
