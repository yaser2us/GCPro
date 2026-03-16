import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { FileAccessToken } from '../entities/file-access-token.entity';

/**
 * FileAccessToken Repository
 * Source: specs/file/file.pillar.v2.yml
 */
@Injectable()
export class FileAccessTokenRepository {
  constructor(
    @InjectRepository(FileAccessToken)
    private readonly repo: Repository<FileAccessToken>,
  ) {}

  /**
   * Create a new access token
   */
  async create(
    data: Partial<FileAccessToken>,
    qr: QueryRunner,
  ): Promise<FileAccessToken> {
    const entity = qr.manager.create(FileAccessToken, data);
    return qr.manager.save(FileAccessToken, entity);
  }

  /**
   * Find by ID
   */
  async findById(
    id: number,
    qr?: QueryRunner,
  ): Promise<FileAccessToken | null> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.findOne(FileAccessToken, { where: { id } });
  }

  /**
   * Find by token string
   */
  async findByToken(
    token: string,
    qr?: QueryRunner,
  ): Promise<FileAccessToken | null> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.findOne(FileAccessToken, { where: { token } });
  }

  /**
   * Find all tokens for a file
   */
  async findByFileId(
    fileId: number,
    qr?: QueryRunner,
  ): Promise<FileAccessToken[]> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.find(FileAccessToken, {
      where: { file_id: fileId },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Increment token usage count
   */
  async incrementUsage(id: number, qr: QueryRunner): Promise<void> {
    await qr.manager.increment(FileAccessToken, { id }, 'used_count', 1);
  }

  /**
   * Revoke token
   */
  async revoke(id: number, qr: QueryRunner): Promise<void> {
    await qr.manager.update(FileAccessToken, { id }, { revoked_at: new Date() });
  }

  /**
   * Check if token is valid (not expired, not revoked, under usage limit)
   */
  async isTokenValid(token: string, qr?: QueryRunner): Promise<boolean> {
    const accessToken = await this.findByToken(token, qr);
    if (!accessToken) {
      return false;
    }

    // Check if revoked
    if (accessToken.revoked_at) {
      return false;
    }

    // Check if expired
    if (accessToken.expires_at && accessToken.expires_at < new Date()) {
      return false;
    }

    // Check usage limit
    if (
      accessToken.max_uses > 0 &&
      accessToken.used_count >= accessToken.max_uses
    ) {
      return false;
    }

    return true;
  }
}
