import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { GuidelineAcceptance } from '../entities/guideline-acceptance.entity';

@Injectable()
export class GuidelineAcceptanceRepository {
  constructor(
    @InjectRepository(GuidelineAcceptance)
    private readonly repository: Repository<GuidelineAcceptance>,
  ) {}

  async create(data: Partial<GuidelineAcceptance>, queryRunner?: QueryRunner): Promise<number> {
    const repo = queryRunner ? queryRunner.manager.getRepository(GuidelineAcceptance) : this.repository;
    const result = await repo
      .createQueryBuilder()
      .insert()
      .into(GuidelineAcceptance)
      .values(data)
      .orIgnore()
      .execute();
    if (result.identifiers[0]?.id) {
      return Number(result.identifiers[0].id);
    }
    const existing = await repo.findOne({ where: { idempotency_key: data.idempotency_key as string } });
    return existing!.id;
  }

  async findById(id: number, queryRunner?: QueryRunner): Promise<GuidelineAcceptance | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(GuidelineAcceptance) : this.repository;
    return repo.findOne({ where: { id } });
  }

  async findByIdempotencyKey(key: string, queryRunner?: QueryRunner): Promise<GuidelineAcceptance | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(GuidelineAcceptance) : this.repository;
    return repo.findOne({ where: { idempotency_key: key } });
  }

  async findByVersionAndSubject(versionId: number, accountId: number | null, personId: number | null, userId: number | null, queryRunner?: QueryRunner): Promise<GuidelineAcceptance | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(GuidelineAcceptance) : this.repository;
    return repo.findOne({ where: { version_id: versionId, account_id: accountId ?? undefined, person_id: personId ?? undefined, user_id: userId ?? undefined } });
  }
}
