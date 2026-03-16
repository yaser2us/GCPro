import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { UserCredential } from '../entities/user-credential.entity';

/**
 * UserCredentialRepository
 * Handles database operations for user_credential table
 * Source: specs/user/user.pillar.v2.yml
 */
@Injectable()
export class UserCredentialRepository {
  constructor(
    @InjectRepository(UserCredential)
    private readonly repo: Repository<UserCredential>,
  ) {}

  /**
   * Find credential by user_id and type
   */
  async findByUserIdAndType(
    userId: number,
    type: string,
    queryRunner?: QueryRunner,
  ): Promise<UserCredential | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(UserCredential, {
      where: { user_id: userId, type },
    });
  }

  /**
   * Find all credentials for a user
   */
  async findByUserId(
    userId: number,
    queryRunner?: QueryRunner,
  ): Promise<UserCredential[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(UserCredential, {
      where: { user_id: userId },
      order: { created_at: 'ASC' },
    });
  }

  /**
   * Create credential
   */
  async create(
    data: Partial<UserCredential>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(UserCredential, data);
    return result.identifiers[0].id;
  }

  /**
   * Update credential
   */
  async update(
    id: number,
    data: Partial<UserCredential>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(UserCredential, { id }, data);
  }
}
