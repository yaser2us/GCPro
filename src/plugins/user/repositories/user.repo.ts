import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { User } from '../entities/user.entity';

/**
 * UserRepository
 * Handles database operations for user table
 * Source: specs/user/user.pillar.v2.yml
 */
@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  /**
   * Find user by ID
   */
  async findById(id: number, queryRunner?: QueryRunner): Promise<User | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(User, { where: { id } });
  }

  /**
   * Find user by phone number
   */
  async findByPhoneNumber(
    phoneNumber: string,
    queryRunner?: QueryRunner,
  ): Promise<User | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(User, { where: { phone_number: phoneNumber } });
  }

  /**
   * Find user by email
   */
  async findByEmail(
    email: string,
    queryRunner?: QueryRunner,
  ): Promise<User | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(User, { where: { email } });
  }

  /**
   * Create user
   * Returns the inserted ID (auto-increment)
   */
  async create(
    data: Partial<User>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(User, data);
    return result.identifiers[0].id;
  }

  /**
   * Update user by ID
   */
  async update(
    id: number,
    data: Partial<User>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(User, { id }, data);
  }

  /**
   * List all users
   */
  async findAll(queryRunner?: QueryRunner): Promise<User[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(User, {
      order: { created_at: 'DESC' },
    });
  }
}
