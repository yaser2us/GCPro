import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { User } from '../../user/entities/user.entity';

/**
 * UserReadRepository (identity plugin)
 * Read-only access to the user table — used by Login and GetCurrentUser commands.
 * Identity pillar never writes to the user table (owned by user pillar).
 * Source: specs/identity/identity.pillar.v2.yml — dependencies.core_tables_readonly
 */
@Injectable()
export class UserReadRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async findById(id: number, queryRunner?: QueryRunner): Promise<User | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(User, { where: { id } });
  }

  async findByPhoneNumber(phoneNumber: string, queryRunner?: QueryRunner): Promise<User | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(User, { where: { phone_number: phoneNumber } });
  }

  async findByEmail(email: string, queryRunner?: QueryRunner): Promise<User | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(User, { where: { email } });
  }

  async findByChannelValue(channelValue: string, queryRunner?: QueryRunner): Promise<User | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const byPhone = await manager.findOne(User, { where: { phone_number: channelValue } });
    if (byPhone) return byPhone;
    return manager.findOne(User, { where: { email: channelValue } });
  }
}
