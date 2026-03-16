import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { randomBytes } from 'crypto';
import { FileUploadRepository } from '../repositories/file-upload.repo';
import { FileVersionRepository } from '../repositories/file-version.repo';
import { FileAccessTokenRepository } from '../repositories/file-access-token.repo';
import { FileEventRepository } from '../repositories/file-event.repo';
import { FileLinkRepository } from '../repositories/file-link.repo';
import { FileScanResultRepository } from '../repositories/file-scan-result.repo';
import { FileTagRepository } from '../repositories/file-tag.repo';
import { FileUploadTagRepository } from '../repositories/file-upload-tag.repo';
import { FileUploadCreateRequestDto } from '../dto/file-upload-create.request.dto';
import { FileUploadCompleteRequestDto } from '../dto/file-upload-complete.request.dto';
import { FileAccessTokenGenerateRequestDto } from '../dto/file-access-token-generate.request.dto';
import { FileLinkCreateRequestDto } from '../dto/file-link-create.request.dto';
import { FileScanRecordRequestDto } from '../dto/file-scan-record.request.dto';
import { FileTagCreateRequestDto } from '../dto/file-tag-create.request.dto';
import { FileTagAssignRequestDto } from '../dto/file-tag-assign.request.dto';

/**
 * File Workflow Service
 * Source: specs/file/file.pillar.v2.yml
 *
 * Implements all 18 file management commands with Guard → Write → Emit → Commit pattern
 */
@Injectable()
export class FileWorkflowService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly fileUploadRepo: FileUploadRepository,
    private readonly fileVersionRepo: FileVersionRepository,
    private readonly fileAccessTokenRepo: FileAccessTokenRepository,
    private readonly fileEventRepo: FileEventRepository,
    private readonly fileLinkRepo: FileLinkRepository,
    private readonly fileScanResultRepo: FileScanResultRepository,
    private readonly fileTagRepo: FileTagRepository,
    private readonly fileUploadTagRepo: FileUploadTagRepository,
  ) {}

  /**
   * FileUpload.Create
   * Creates a new file upload record with status='created'
   */
  async createFileUpload(
    request: FileUploadCreateRequestDto,
  ): Promise<{ file_id: number; file_key: string }> {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Guard: Generate unique file_key
      const fileKey = request.file_key || this.generateFileKey();

      // Write: Create file upload record
      const fileUpload = await this.fileUploadRepo.upsertByFileKey(
        {
          file_key: fileKey,
          status: 'created',
          owner_account_id: request.owner_account_id
            ? parseInt(request.owner_account_id)
            : null,
          owner_person_id: request.owner_person_id
            ? parseInt(request.owner_person_id)
            : null,
          owner_type: request.owner_type || 'account',
          purpose_code: request.purpose_code || 'other',
          visibility: request.visibility || 'private',
        },
        qr,
      );

      // Emit: FileUpload.Created event
      await this.fileEventRepo.create(
        {
          file_id: fileUpload.id,
          event_type: 'FileUpload.Created',
          occurred_at: new Date(),
          actor_id: request.owner_account_id
            ? parseInt(request.owner_account_id)
            : null,
        },
        qr,
      );

      // Commit
      await qr.commitTransaction();

      return {
        file_id: fileUpload.id,
        file_key: fileUpload.file_key,
      };
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  /**
   * FileUpload.Complete
   * Marks file upload as complete with status='uploaded'
   */
  async completeFileUpload(
    fileId: number,
    request: FileUploadCompleteRequestDto,
  ): Promise<void> {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Guard: Verify file exists
      const fileUpload = await this.fileUploadRepo.findById(fileId, qr);
      if (!fileUpload) {
        throw new Error(`File ${fileId} not found`);
      }

      // Write: Update file upload
      await this.fileUploadRepo.update(
        fileId,
        {
          status: 'uploaded',
          storage_path: request.storage_path,
          original_filename: request.original_filename,
          size_bytes: request.size_bytes,
          content_type: request.content_type,
          checksum_sha256: request.checksum_sha256,
          extension: request.extension,
          storage_etag: request.storage_etag,
          uploaded_at: new Date(),
        },
        qr,
      );

      // Emit: FileUpload.Completed event
      await this.fileEventRepo.create(
        {
          file_id: fileId,
          event_type: 'FileUpload.Completed',
          occurred_at: new Date(),
        },
        qr,
      );

      // Commit
      await qr.commitTransaction();
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  /**
   * FileUpload.Fail
   * Marks file upload as failed
   */
  async failFileUpload(
    fileId: number,
    reason?: string,
  ): Promise<void> {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Guard: Verify file exists
      const fileUpload = await this.fileUploadRepo.findById(fileId, qr);
      if (!fileUpload) {
        throw new Error(`File ${fileId} not found`);
      }

      // Write: Update file upload
      await this.fileUploadRepo.update(
        fileId,
        {
          status: 'failed',
        },
        qr,
      );

      // Emit: FileUpload.Failed event
      await this.fileEventRepo.create(
        {
          file_id: fileId,
          event_type: 'FileUpload.Failed',
          occurred_at: new Date(),
          payload_json: reason ? { reason } : null,
        },
        qr,
      );

      // Commit
      await qr.commitTransaction();
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  /**
   * FileUpload.Delete
   * Soft deletes a file upload
   */
  async deleteFileUpload(
    fileId: number,
    deletedByUserId?: number,
  ): Promise<void> {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Guard: Verify file exists
      const fileUpload = await this.fileUploadRepo.findById(fileId, qr);
      if (!fileUpload) {
        throw new Error(`File ${fileId} not found`);
      }

      // Write: Soft delete file upload
      await this.fileUploadRepo.softDelete(fileId, qr);

      // Emit: FileUpload.Deleted event
      await this.fileEventRepo.create(
        {
          file_id: fileId,
          event_type: 'FileUpload.Deleted',
          occurred_at: new Date(),
          actor_id: deletedByUserId,
        },
        qr,
      );

      // Commit
      await qr.commitTransaction();
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  /**
   * FileVersion.Create
   * Creates a new version snapshot of a file
   */
  async createFileVersion(
    fileId: number,
    createdByUserId?: number,
  ): Promise<{ version_id: number; version_number: number }> {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Guard: Verify file exists and get current state
      const fileUpload = await this.fileUploadRepo.findById(fileId, qr);
      if (!fileUpload) {
        throw new Error(`File ${fileId} not found`);
      }

      // Get next version number
      const latestVersion = await this.fileVersionRepo.getLatestVersionNumber(
        fileId,
        qr,
      );
      const versionNumber = latestVersion + 1;

      // Write: Create version snapshot
      const fileVersion = await this.fileVersionRepo.create(
        {
          file_id: fileId,
          version_no: versionNumber,
          storage_path: fileUpload.storage_path,
          content_type: fileUpload.content_type,
          size_bytes: fileUpload.size_bytes,
          checksum_sha256: fileUpload.checksum_sha256,
          storage_provider: fileUpload.storage_provider,
          storage_bucket: fileUpload.storage_bucket,
          storage_etag: fileUpload.storage_etag,
        },
        qr,
      );

      // Emit: FileVersion.Created event
      await this.fileEventRepo.create(
        {
          file_id: fileId,
          event_type: 'FileVersion.Created',
          occurred_at: new Date(),
          actor_id: createdByUserId,
          payload_json: { version_number: versionNumber },
        },
        qr,
      );

      // Commit
      await qr.commitTransaction();

      return {
        version_id: fileVersion.id,
        version_number: versionNumber,
      };
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  /**
   * FileAccessToken.Generate
   * Generates a temporary access token for a file
   */
  async generateFileAccessToken(
    fileId: number,
    request: FileAccessTokenGenerateRequestDto,
  ): Promise<{ token: string; expires_at: Date | null }> {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Guard: Verify file exists
      const fileUpload = await this.fileUploadRepo.findById(fileId, qr);
      if (!fileUpload) {
        throw new Error(`File ${fileId} not found`);
      }

      // Generate secure token
      const token = this.generateAccessToken();

      // Calculate expiration
      let expiresAt: Date | null = null;
      if (request.expires_in_seconds) {
        expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + request.expires_in_seconds);
      }

      // Write: Create access token
      const accessToken = await this.fileAccessTokenRepo.create(
        {
          file_id: fileId,
          token,
          token_type: request.token_type || 'download',
          expires_at: expiresAt,
          max_uses: request.max_uses || 0,
        },
        qr,
      );

      // Emit: FileAccessToken.Generated event
      await this.fileEventRepo.create(
        {
          file_id: fileId,
          event_type: 'FileAccessToken.Generated',
          occurred_at: new Date(),
        },
        qr,
      );

      // Commit
      await qr.commitTransaction();

      return {
        token: accessToken.token,
        expires_at: accessToken.expires_at,
      };
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  /**
   * FileAccessToken.Validate
   * Validates and optionally uses an access token
   */
  async validateFileAccessToken(
    token: string,
    incrementUsage: boolean = false,
  ): Promise<{ valid: boolean; file_id?: number }> {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Guard: Find token
      const accessToken = await this.fileAccessTokenRepo.findByToken(token, qr);
      if (!accessToken) {
        await qr.commitTransaction();
        return { valid: false };
      }

      // Validate token
      const isValid = await this.fileAccessTokenRepo.isTokenValid(token, qr);
      if (!isValid) {
        await qr.commitTransaction();
        return { valid: false, file_id: accessToken.file_id };
      }

      // Write: Increment usage if requested
      if (incrementUsage) {
        await this.fileAccessTokenRepo.incrementUsage(accessToken.id, qr);

        // Emit: FileAccessToken.Used event
        await this.fileEventRepo.create(
          {
            file_id: accessToken.file_id,
            event_type: 'FileAccessToken.Used',
            occurred_at: new Date(),
          },
          qr,
        );
      }

      // Commit
      await qr.commitTransaction();

      return { valid: true, file_id: accessToken.file_id };
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  /**
   * FileAccessToken.Revoke
   * Revokes an access token
   */
  async revokeFileAccessToken(token: string): Promise<void> {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Guard: Find token
      const accessToken = await this.fileAccessTokenRepo.findByToken(token, qr);
      if (!accessToken) {
        throw new Error('Token not found');
      }

      // Write: Revoke token
      await this.fileAccessTokenRepo.revoke(accessToken.id, qr);

      // Emit: FileAccessToken.Revoked event
      await this.fileEventRepo.create(
        {
          file_id: accessToken.file_id,
          event_type: 'FileAccessToken.Revoked',
          occurred_at: new Date(),
        },
        qr,
      );

      // Commit
      await qr.commitTransaction();
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  /**
   * FileEvent.Record
   * Records a custom file event
   */
  async recordFileEvent(
    fileId: number,
    eventType: string,
    eventData?: any,
    triggeredByUserId?: number,
  ): Promise<{ event_id: number }> {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Guard: Verify file exists
      const fileUpload = await this.fileUploadRepo.findById(fileId, qr);
      if (!fileUpload) {
        throw new Error(`File ${fileId} not found`);
      }

      // Write: Create event
      const fileEvent = await this.fileEventRepo.create(
        {
          file_id: fileId,
          event_type: eventType,
          occurred_at: new Date(),
          actor_id: triggeredByUserId,
          payload_json: eventData || null,
        },
        qr,
      );

      // Commit
      await qr.commitTransaction();

      return { event_id: fileEvent.id };
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  /**
   * FileLink.Create
   * Links a file to a target entity (polymorphic)
   */
  async createFileLink(
    fileId: number,
    request: FileLinkCreateRequestDto,
  ): Promise<{ link_id: number }> {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Guard: Verify file exists
      const fileUpload = await this.fileUploadRepo.findById(fileId, qr);
      if (!fileUpload) {
        throw new Error(`File ${fileId} not found`);
      }

      // Write: Create file link (upsert for idempotency)
      const fileLink = await this.fileLinkRepo.upsertByConstraint(
        {
          file_id: fileId,
          target_type: request.target_type,
          target_id: request.target_id,
          role_code: request.role_code || null,
        },
        qr,
      );

      // Emit: FileLink.Created event
      await this.fileEventRepo.create(
        {
          file_id: fileId,
          event_type: 'FileLink.Created',
          occurred_at: new Date(),
          payload_json: {
            target_type: request.target_type,
            target_id: request.target_id,
          },
        },
        qr,
      );

      // Commit
      await qr.commitTransaction();

      return { link_id: fileLink.id };
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  /**
   * FileLink.Remove
   * Removes a file link
   */
  async removeFileLink(linkId: number): Promise<void> {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Guard: Verify link exists
      const fileLink = await this.fileLinkRepo.findById(linkId, qr);
      if (!fileLink) {
        throw new Error(`File link ${linkId} not found`);
      }

      // Write: Delete file link
      await this.fileLinkRepo.delete(linkId, qr);

      // Emit: FileLink.Removed event
      await this.fileEventRepo.create(
        {
          file_id: fileLink.file_id,
          event_type: 'FileLink.Removed',
          occurred_at: new Date(),
        },
        qr,
      );

      // Commit
      await qr.commitTransaction();
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  /**
   * FileScan.Start
   * Initiates virus scan for a file
   */
  async startFileScan(
    fileId: number,
    scanType: string = 'antivirus',
  ): Promise<void> {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Guard: Verify file exists
      const fileUpload = await this.fileUploadRepo.findById(fileId, qr);
      if (!fileUpload) {
        throw new Error(`File ${fileId} not found`);
      }

      // Write: Update file status to scanning
      await this.fileUploadRepo.update(
        fileId,
        {
          status: 'scanning',
        },
        qr,
      );

      // Emit: FileScan.Started event
      await this.fileEventRepo.create(
        {
          file_id: fileId,
          event_type: 'FileScan.Started',
          occurred_at: new Date(),
          payload_json: { scan_type: scanType },
        },
        qr,
      );

      // Commit
      await qr.commitTransaction();
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  /**
   * FileScan.Record
   * Records scan result from external scanner
   */
  async recordFileScan(
    fileId: number,
    request: FileScanRecordRequestDto,
  ): Promise<{ scan_id: number }> {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Guard: Verify file exists
      const fileUpload = await this.fileUploadRepo.findById(fileId, qr);
      if (!fileUpload) {
        throw new Error(`File ${fileId} not found`);
      }

      // Write: Create scan result
      const scanResult = await this.fileScanResultRepo.create(
        {
          file_id: fileId,
          scan_type: request.scan_type,
          status: request.status,
          provider: request.provider,
          summary: request.summary,
          scanned_at: new Date(),
        },
        qr,
      );

      // Emit: FileScan.Recorded event
      await this.fileEventRepo.create(
        {
          file_id: fileId,
          event_type: 'FileScan.Recorded',
          occurred_at: new Date(),
          payload_json: {
            scan_type: request.scan_type,
            status: request.status,
          },
        },
        qr,
      );

      // Commit
      await qr.commitTransaction();

      return { scan_id: scanResult.id };
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  /**
   * FileScan.MarkClean
   * Marks file as clean after successful scan
   */
  async markFileClean(fileId: number): Promise<void> {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Guard: Verify file exists
      const fileUpload = await this.fileUploadRepo.findById(fileId, qr);
      if (!fileUpload) {
        throw new Error(`File ${fileId} not found`);
      }

      // Write: Update file status to clean
      await this.fileUploadRepo.update(
        fileId,
        {
          status: 'clean',
        },
        qr,
      );

      // Emit: FileScan.Clean event
      await this.fileEventRepo.create(
        {
          file_id: fileId,
          event_type: 'FileScan.Clean',
          occurred_at: new Date(),
        },
        qr,
      );

      // Commit
      await qr.commitTransaction();
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  /**
   * FileScan.MarkInfected
   * Marks file as infected/dangerous
   */
  async markFileInfected(fileId: number, reason?: string): Promise<void> {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Guard: Verify file exists
      const fileUpload = await this.fileUploadRepo.findById(fileId, qr);
      if (!fileUpload) {
        throw new Error(`File ${fileId} not found`);
      }

      // Write: Update file status to infected
      await this.fileUploadRepo.update(
        fileId,
        {
          status: 'infected',
        },
        qr,
      );

      // Emit: FileScan.Infected event
      await this.fileEventRepo.create(
        {
          file_id: fileId,
          event_type: 'FileScan.Infected',
          occurred_at: new Date(),
          payload_json: reason ? { reason } : null,
        },
        qr,
      );

      // Commit
      await qr.commitTransaction();
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  /**
   * FileTag.Create
   * Creates a new file tag definition
   */
  async createFileTag(request: FileTagCreateRequestDto): Promise<{ tag_id: number }> {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Write: Create tag (upsert for idempotency)
      const fileTag = await this.fileTagRepo.upsertByCode(
        {
          code: request.code,
          name: request.name,
        },
        qr,
      );

      // Commit
      await qr.commitTransaction();

      return { tag_id: fileTag.id };
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  /**
   * FileTag.Assign
   * Assigns a tag to a file
   */
  async assignFileTag(
    fileId: number,
    request: FileTagAssignRequestDto,
  ): Promise<{ assignment_id: number }> {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Guard: Verify file exists
      const fileUpload = await this.fileUploadRepo.findById(fileId, qr);
      if (!fileUpload) {
        throw new Error(`File ${fileId} not found`);
      }

      // Guard: Verify tag exists
      const tagId = parseInt(request.tag_id);
      const fileTag = await this.fileTagRepo.findById(tagId, qr);
      if (!fileTag) {
        throw new Error(`Tag ${request.tag_id} not found`);
      }

      // Write: Assign tag (upsert for idempotency)
      const assignment = await this.fileUploadTagRepo.upsertByConstraint(
        {
          file_id: fileId,
          tag_id: tagId,
        },
        qr,
      );

      // Emit: FileTag.Assigned event
      await this.fileEventRepo.create(
        {
          file_id: fileId,
          event_type: 'FileTag.Assigned',
          occurred_at: new Date(),
          payload_json: { tag_id: tagId },
        },
        qr,
      );

      // Commit
      await qr.commitTransaction();

      return { assignment_id: assignment.id };
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  /**
   * FileTag.Unassign
   * Removes a tag from a file
   */
  async unassignFileTag(fileId: number, tagId: number): Promise<void> {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Write: Remove tag assignment
      await this.fileUploadTagRepo.deleteByFileAndTag(fileId, tagId, qr);

      // Emit: FileTag.Unassigned event
      await this.fileEventRepo.create(
        {
          file_id: fileId,
          event_type: 'FileTag.Unassigned',
          occurred_at: new Date(),
          payload_json: { tag_id: tagId },
        },
        qr,
      );

      // Commit
      await qr.commitTransaction();
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  /**
   * Generate unique file key
   */
  private generateFileKey(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Generate secure access token
   */
  private generateAccessToken(): string {
    return randomBytes(64).toString('hex');
  }
}
