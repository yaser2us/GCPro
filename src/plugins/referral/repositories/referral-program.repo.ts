import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ReferralProgram } from '../entities/referral-program.entity';

/**
 * ReferralProgramRepository
 * Handles database operations for referral_program table
 * Source: specs/referral/referral.pillar.yml aggregates.REFERRAL_PROGRAM
 */
@Injectable()
export class ReferralProgramRepository {
  constructor(
    @InjectRepository(ReferralProgram)
    private readonly repo: Repository<ReferralProgram>,
  ) {}

  /**
   * Find referral program by ID
   */
  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<ReferralProgram | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(ReferralProgram, { where: { id } });
  }

  /**
   * Find referral program by code
   */
  async findByCode(
    code: string,
    queryRunner?: QueryRunner,
  ): Promise<ReferralProgram | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(ReferralProgram, { where: { code } });
  }

  /**
   * Create referral program
   * Returns the inserted ID (auto-increment)
   */
  async create(
    data: Partial<ReferralProgram>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(ReferralProgram, data);
    return result.identifiers[0].id;
  }

  /**
   * Update referral program by ID
   */
  async update(
    id: number,
    data: Partial<ReferralProgram>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(ReferralProgram, { id }, data);
  }
}
