import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileUpload } from './entities/file-upload.entity';
import { FileVersion } from './entities/file-version.entity';
import { FileAccessToken } from './entities/file-access-token.entity';
import { FileEvent } from './entities/file-event.entity';
import { FileLink } from './entities/file-link.entity';
import { FileScanResult } from './entities/file-scan-result.entity';
import { FileTag } from './entities/file-tag.entity';
import { FileUploadTag } from './entities/file-upload-tag.entity';
import { FileUploadRepository } from './repositories/file-upload.repo';
import { FileVersionRepository } from './repositories/file-version.repo';
import { FileAccessTokenRepository } from './repositories/file-access-token.repo';
import { FileEventRepository } from './repositories/file-event.repo';
import { FileLinkRepository } from './repositories/file-link.repo';
import { FileScanResultRepository } from './repositories/file-scan-result.repo';
import { FileTagRepository } from './repositories/file-tag.repo';
import { FileUploadTagRepository } from './repositories/file-upload-tag.repo';
import { FileWorkflowService } from './services/file.workflow.service';
import { FileController } from './controllers/file.controller';

/**
 * File Module
 * Source: specs/file/file.pillar.v2.yml
 *
 * Provides file lifecycle management with:
 * - 8 entities (file_upload, file_version, file_access_token, etc.)
 * - 8 repositories
 * - 18 commands (FileUpload.Create, FileAccessToken.Generate, etc.)
 * - 18 endpoints
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      FileUpload,
      FileVersion,
      FileAccessToken,
      FileEvent,
      FileLink,
      FileScanResult,
      FileTag,
      FileUploadTag,
    ]),
  ],
  providers: [
    FileUploadRepository,
    FileVersionRepository,
    FileAccessTokenRepository,
    FileEventRepository,
    FileLinkRepository,
    FileScanResultRepository,
    FileTagRepository,
    FileUploadTagRepository,
    FileWorkflowService,
  ],
  controllers: [FileController],
  exports: [FileWorkflowService],
})
export class FileModule {}
