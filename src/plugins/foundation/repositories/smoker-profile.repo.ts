import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { SmokProfile } from '../entities/smoker-profile.entity';

@Injectable()
export class SmokProfileRepository {
  constructor(
    @InjectRepository(SmokProfile)
    private readonly repository: Repository<SmokProfile>,
  ) {}

  async upsert(data: Partial<SmokProfile>, queryRunner?: QueryRunner): Promise<number> {
    const repo = queryRunner ? queryRunner.manager.getRepository(SmokProfile) : this.repository;
    const result = await repo
      .createQueryBuilder()
      .insert()
      .into(SmokProfile)
      .values(data)
      .orUpdate(['smoker_factor', 'loading_pct'], ['code'])
      .execute();
    return Number(result.identifiers[0]?.id ?? result.raw?.insertId);
  }

  async findById(id: number, queryRunner?: QueryRunner): Promise<SmokProfile | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(SmokProfile) : this.repository;
    return repo.findOne({ where: { id } });
  }

  async findByCode(code: string, queryRunner?: QueryRunner): Promise<SmokProfile | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(SmokProfile) : this.repository;
    return repo.findOne({ where: { code } });
  }

  async findAll(queryRunner?: QueryRunner): Promise<SmokProfile[]> {
    const repo = queryRunner ? queryRunner.manager.getRepository(SmokProfile) : this.repository;
    return repo.find({ order: { code: 'ASC' } });
  }
}
