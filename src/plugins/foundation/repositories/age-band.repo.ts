import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { AgeBand } from '../entities/age-band.entity';

@Injectable()
export class AgeBandRepository {
  constructor(
    @InjectRepository(AgeBand)
    private readonly repository: Repository<AgeBand>,
  ) {}

  async upsert(data: Partial<AgeBand>, queryRunner?: QueryRunner): Promise<number> {
    const repo = queryRunner ? queryRunner.manager.getRepository(AgeBand) : this.repository;
    const result = await repo
      .createQueryBuilder()
      .insert()
      .into(AgeBand)
      .values(data)
      .orUpdate(['min_age', 'max_age', 'age_factor'], ['code'])
      .execute();
    return Number(result.identifiers[0]?.id ?? result.raw?.insertId);
  }

  async findById(id: number, queryRunner?: QueryRunner): Promise<AgeBand | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(AgeBand) : this.repository;
    return repo.findOne({ where: { id } });
  }

  async findByCode(code: string, queryRunner?: QueryRunner): Promise<AgeBand | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(AgeBand) : this.repository;
    return repo.findOne({ where: { code } });
  }

  async findAll(queryRunner?: QueryRunner): Promise<AgeBand[]> {
    const repo = queryRunner ? queryRunner.manager.getRepository(AgeBand) : this.repository;
    return repo.find({ order: { min_age: 'ASC' } });
  }
}
