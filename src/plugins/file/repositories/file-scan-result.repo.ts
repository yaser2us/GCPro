import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { FileScanResult } from '../entities/file-scan-result.entity';

/**
 * FileScanResult Repository
 * Source: specs/file/file.pillar.v2.yml
 *
 * Manages virus scan results for files
 */
@Injectable()
export class FileScanResultRepository {
  constructor(
    @InjectRepository(FileScanResult)
    private readonly repo: Repository<FileScanResult>,
  ) {}

  /**
   * Create a new scan result
   */
  async create(
    data: Partial<FileScanResult>,
    qr: QueryRunner,
  ): Promise<FileScanResult> {
    const entity = qr.manager.create(FileScanResult, data);
    return qr.manager.save(FileScanResult, entity);
  }

  /**
   * Find by ID
   */
  async findById(
    id: number,
    qr?: QueryRunner,
  ): Promise<FileScanResult | null> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.findOne(FileScanResult, { where: { id } });
  }

  /**
   * Find all scan results for a file
   */
  async findByFileId(
    fileId: number,
    qr?: QueryRunner,
  ): Promise<FileScanResult[]> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.find(FileScanResult, {
      where: { file_id: fileId },
      order: { scanned_at: 'DESC' },
    });
  }

  /**
   * Find scan results by type for a file
   */
  async findByFileIdAndType(
    fileId: number,
    scanType: string,
    qr?: QueryRunner,
  ): Promise<FileScanResult[]> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.find(FileScanResult, {
      where: { file_id: fileId, scan_type: scanType },
      order: { scanned_at: 'DESC' },
    });
  }

  /**
   * Get latest scan result for a file
   */
  async getLatestScan(
    fileId: number,
    qr?: QueryRunner,
  ): Promise<FileScanResult | null> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.findOne(FileScanResult, {
      where: { file_id: fileId },
      order: { scanned_at: 'DESC' },
    });
  }

  /**
   * Get latest scan result by type
   */
  async getLatestScanByType(
    fileId: number,
    scanType: string,
    qr?: QueryRunner,
  ): Promise<FileScanResult | null> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.findOne(FileScanResult, {
      where: { file_id: fileId, scan_type: scanType },
      order: { scanned_at: 'DESC' },
    });
  }
}
