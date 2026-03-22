import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { GeoState } from '../entities/geo-state.entity';

@Injectable()
export class GeoStateRepository {
  constructor(
    @InjectRepository(GeoState)
    private readonly repository: Repository<GeoState>,
  ) {}

  async upsert(data: Partial<GeoState>, queryRunner?: QueryRunner): Promise<number> {
    const repo = queryRunner ? queryRunner.manager.getRepository(GeoState) : this.repository;
    const result = await repo
      .createQueryBuilder()
      .insert()
      .into(GeoState)
      .values(data)
      .orUpdate(['name', 'status'], ['country_code', 'state_code'])
      .execute();
    return Number(result.identifiers[0]?.id ?? result.raw?.insertId);
  }

  async findById(id: number, queryRunner?: QueryRunner): Promise<GeoState | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(GeoState) : this.repository;
    return repo.findOne({ where: { id } });
  }

  async findByCountryAndCode(countryCode: string, stateCode: string, queryRunner?: QueryRunner): Promise<GeoState | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(GeoState) : this.repository;
    return repo.findOne({ where: { country_code: countryCode, state_code: stateCode } });
  }

  async findByCountry(countryCode: string, queryRunner?: QueryRunner): Promise<GeoState[]> {
    const repo = queryRunner ? queryRunner.manager.getRepository(GeoState) : this.repository;
    return repo.find({ where: { country_code: countryCode, status: 'active' }, order: { name: 'ASC' } });
  }
}
