import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { GuidelineVersion } from '../entities/guideline-version.entity';

@Injectable()
export class GuidelineVersionRepository {
  constructor(
    @InjectRepository(GuidelineVersion)
    private readonly repository: Repository<GuidelineVersion>,
  ) {}

  async create(data: Partial<GuidelineVersion>, queryRunner?: QueryRunner): Promise<number> {
    const repo = queryRunner ? queryRunner.manager.getRepository(GuidelineVersion) : this.repository;
    const result = await repo.insert(data);
    return Number(result.identifiers[0].id);
  }

  async findById(id: number, queryRunner?: QueryRunner): Promise<GuidelineVersion | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(GuidelineVersion) : this.repository;
    return repo.findOne({ where: { id } });
  }

  async update(id: number, data: Partial<GuidelineVersion>, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(GuidelineVersion) : this.repository;
    await repo.update(id, data);
  }

  async findByDocumentVersionLocale(documentId: number, versionCode: string, locale: string, queryRunner?: QueryRunner): Promise<GuidelineVersion | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(GuidelineVersion) : this.repository;
    return repo.findOne({ where: { document_id: documentId, version_code: versionCode, locale } });
  }

  async findByDocument(documentId: number, queryRunner?: QueryRunner): Promise<GuidelineVersion[]> {
    const repo = queryRunner ? queryRunner.manager.getRepository(GuidelineVersion) : this.repository;
    return repo.find({ where: { document_id: documentId }, order: { created_at: 'DESC' } });
  }
}
