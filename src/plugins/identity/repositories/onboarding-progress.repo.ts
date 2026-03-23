import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { OnboardingProgress } from '../../user/entities/onboarding-progress.entity';

/**
 * OnboardingProgressRepository (identity plugin)
 * Source: specs/identity/identity.pillar.v2.yml
 */
@Injectable()
export class OnboardingProgressRepository {
  constructor(
    @InjectRepository(OnboardingProgress)
    private readonly repo: Repository<OnboardingProgress>,
  ) {}

  async upsert(data: Partial<OnboardingProgress>, queryRunner?: QueryRunner): Promise<number> {
    const repo = queryRunner ? queryRunner.manager.getRepository(OnboardingProgress) : this.repo;
    const result = await repo
      .createQueryBuilder()
      .insert()
      .into(OnboardingProgress)
      .values(data)
      .orUpdate(['state', 'meta_json'], ['user_id', 'step_code'])
      .execute();
    return Number(result.identifiers[0]?.id ?? result.raw?.insertId);
  }

  async findById(id: number, queryRunner?: QueryRunner): Promise<OnboardingProgress | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(OnboardingProgress, { where: { id } });
  }
}
