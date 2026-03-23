import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { RegistrationToken } from '../../user/entities/registration-token.entity';

/**
 * RegistrationTokenRepository (identity plugin)
 * Extends user plugin's repo with cooldown and login-lookup methods.
 * Source: specs/identity/identity.pillar.v2.yml
 */
@Injectable()
export class RegistrationTokenRepository {
  constructor(
    @InjectRepository(RegistrationToken)
    private readonly repo: Repository<RegistrationToken>,
  ) {}

  async insert(data: Partial<RegistrationToken>, queryRunner?: QueryRunner): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(RegistrationToken, data);
    return Number(result.identifiers[0]?.id ?? result.raw?.insertId);
  }

  async findById(id: number, queryRunner?: QueryRunner): Promise<RegistrationToken | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(RegistrationToken, { where: { id } });
  }

  async update(id: number, data: Partial<RegistrationToken>, queryRunner?: QueryRunner): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(RegistrationToken, { id }, data);
  }

  /**
   * Count pending tokens for a channel_value created within the last N seconds.
   * Used by IssueRegistrationToken cooldown guard.
   */
  async countRecentPending(channelValue: string, intervalSeconds: number, queryRunner?: QueryRunner): Promise<number> {
    const repo = queryRunner ? queryRunner.manager.getRepository(RegistrationToken) : this.repo;
    return repo
      .createQueryBuilder('rt')
      .where('rt.channel_value = :channelValue', { channelValue })
      .andWhere('rt.status = :status', { status: 'pending' })
      .andWhere('rt.created_at > DATE_SUB(NOW(), INTERVAL :sec SECOND)', { sec: intervalSeconds })
      .getCount();
  }

  /**
   * Find the most recent pending token for a given channel_value and purpose.
   * Used by Login command to locate the OTP to verify.
   */
  async findLatestPendingByChannelAndPurpose(
    channelValue: string,
    purpose: string,
    queryRunner?: QueryRunner,
  ): Promise<RegistrationToken | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(RegistrationToken) : this.repo;
    return repo
      .createQueryBuilder('rt')
      .where('rt.channel_value = :channelValue', { channelValue })
      .andWhere('rt.purpose = :purpose', { purpose })
      .andWhere('rt.status = :status', { status: 'pending' })
      .orderBy('rt.id', 'DESC')
      .getOne();
  }
}
