import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { RegistrationToken } from '../entities/registration-token.entity';

@Injectable()
export class RegistrationTokenRepository {
  constructor(
    @InjectRepository(RegistrationToken)
    private readonly repo: Repository<RegistrationToken>,
  ) {}

  async insert(
    data: Partial<RegistrationToken>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(RegistrationToken, data);
    return Number(result.identifiers[0]?.id ?? result.raw?.insertId);
  }

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<RegistrationToken | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(RegistrationToken, { where: { id } });
  }

  async update(
    id: number,
    data: Partial<RegistrationToken>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(RegistrationToken, { id }, data);
  }
}
