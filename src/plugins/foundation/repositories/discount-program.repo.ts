import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { DiscountProgram } from '../entities/discount-program.entity';

@Injectable()
export class DiscountProgramRepository {
  constructor(
    @InjectRepository(DiscountProgram)
    private readonly repository: Repository<DiscountProgram>,
  ) {}

  async create(data: Partial<DiscountProgram>, queryRunner?: QueryRunner): Promise<number> {
    const repo = queryRunner ? queryRunner.manager.getRepository(DiscountProgram) : this.repository;
    const result = await repo.insert(data);
    return Number(result.identifiers[0].id);
  }

  async findById(id: number, queryRunner?: QueryRunner): Promise<DiscountProgram | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(DiscountProgram) : this.repository;
    return repo.findOne({ where: { id } });
  }

  async update(id: number, data: Partial<DiscountProgram>, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(DiscountProgram) : this.repository;
    await repo.update(id, data);
  }

  async findByCode(code: string, queryRunner?: QueryRunner): Promise<DiscountProgram | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(DiscountProgram) : this.repository;
    return repo.findOne({ where: { code } });
  }

  async findByStatus(status: string, queryRunner?: QueryRunner): Promise<DiscountProgram[]> {
    const repo = queryRunner ? queryRunner.manager.getRepository(DiscountProgram) : this.repository;
    return repo.find({ where: { status }, order: { created_at: 'DESC' } });
  }
}
