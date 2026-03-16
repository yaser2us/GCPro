import {
  Controller,
  Post,
  Delete,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { FileWorkflowService } from '../services/file.workflow.service';
import { FileUploadCreateRequestDto } from '../dto/file-upload-create.request.dto';
import { FileUploadCompleteRequestDto } from '../dto/file-upload-complete.request.dto';
import { FileAccessTokenGenerateRequestDto } from '../dto/file-access-token-generate.request.dto';
import { FileLinkCreateRequestDto } from '../dto/file-link-create.request.dto';
import { FileScanRecordRequestDto } from '../dto/file-scan-record.request.dto';
import { FileTagCreateRequestDto } from '../dto/file-tag-create.request.dto';
import { FileTagAssignRequestDto } from '../dto/file-tag-assign.request.dto';

/**
 * File Controller
 * Source: specs/file/file.pillar.v2.yml
 *
 * Implements all 18 file management endpoints
 */
@Controller('v1')
export class FileController {
  constructor(private readonly fileWorkflow: FileWorkflowService) {}

  /**
   * POST /v1/files
   * FileUpload.Create - Create new file upload record
   */
  @Post('files')
  async createFileUpload(@Body() request: FileUploadCreateRequestDto) {
    return this.fileWorkflow.createFileUpload(request);
  }

  /**
   * POST /v1/files/:file_id/complete
   * FileUpload.Complete - Mark file upload as complete
   */
  @Post('files/:file_id/complete')
  async completeFileUpload(
    @Param('file_id', ParseIntPipe) fileId: number,
    @Body() request: FileUploadCompleteRequestDto,
  ) {
    await this.fileWorkflow.completeFileUpload(fileId, request);
    return { success: true };
  }

  /**
   * POST /v1/files/:file_id/fail
   * FileUpload.Fail - Mark file upload as failed
   */
  @Post('files/:file_id/fail')
  async failFileUpload(
    @Param('file_id', ParseIntPipe) fileId: number,
    @Body() body?: { reason?: string },
  ) {
    await this.fileWorkflow.failFileUpload(fileId, body?.reason);
    return { success: true };
  }

  /**
   * DELETE /v1/files/:file_id
   * FileUpload.Delete - Soft delete a file
   */
  @Delete('files/:file_id')
  async deleteFileUpload(
    @Param('file_id', ParseIntPipe) fileId: number,
    @Body() body?: { deleted_by_user_id?: number },
  ) {
    await this.fileWorkflow.deleteFileUpload(fileId, body?.deleted_by_user_id);
    return { success: true };
  }

  /**
   * POST /v1/files/:file_id/versions
   * FileVersion.Create - Create new version snapshot
   */
  @Post('files/:file_id/versions')
  async createFileVersion(
    @Param('file_id', ParseIntPipe) fileId: number,
    @Body() body?: { created_by_user_id?: number },
  ) {
    return this.fileWorkflow.createFileVersion(fileId, body?.created_by_user_id);
  }

  /**
   * POST /v1/files/:file_id/tokens
   * FileAccessToken.Generate - Generate temporary access token
   */
  @Post('files/:file_id/tokens')
  async generateFileAccessToken(
    @Param('file_id', ParseIntPipe) fileId: number,
    @Body() request: FileAccessTokenGenerateRequestDto,
  ) {
    return this.fileWorkflow.generateFileAccessToken(fileId, request);
  }

  /**
   * POST /v1/file-tokens/validate
   * FileAccessToken.Validate - Validate access token
   */
  @Post('file-tokens/validate')
  async validateFileAccessToken(
    @Body() body: { token: string; increment_usage?: boolean },
  ) {
    return this.fileWorkflow.validateFileAccessToken(
      body.token,
      body.increment_usage || false,
    );
  }

  /**
   * POST /v1/file-tokens/revoke
   * FileAccessToken.Revoke - Revoke access token
   */
  @Post('file-tokens/revoke')
  async revokeFileAccessToken(@Body() body: { token: string }) {
    await this.fileWorkflow.revokeFileAccessToken(body.token);
    return { success: true };
  }

  /**
   * POST /v1/files/:file_id/events
   * FileEvent.Record - Record custom file event
   */
  @Post('files/:file_id/events')
  async recordFileEvent(
    @Param('file_id', ParseIntPipe) fileId: number,
    @Body()
    body: {
      event_type: string;
      event_data?: any;
      triggered_by_user_id?: number;
    },
  ) {
    return this.fileWorkflow.recordFileEvent(
      fileId,
      body.event_type,
      body.event_data,
      body.triggered_by_user_id,
    );
  }

  /**
   * POST /v1/files/:file_id/links
   * FileLink.Create - Create polymorphic file link
   */
  @Post('files/:file_id/links')
  async createFileLink(
    @Param('file_id', ParseIntPipe) fileId: number,
    @Body() request: FileLinkCreateRequestDto,
  ) {
    return this.fileWorkflow.createFileLink(fileId, request);
  }

  /**
   * DELETE /v1/file-links/:link_id
   * FileLink.Remove - Remove file link
   */
  @Delete('file-links/:link_id')
  async removeFileLink(@Param('link_id', ParseIntPipe) linkId: number) {
    await this.fileWorkflow.removeFileLink(linkId);
    return { success: true };
  }

  /**
   * POST /v1/files/:file_id/scan/start
   * FileScan.Start - Start virus scan
   */
  @Post('files/:file_id/scan/start')
  async startFileScan(
    @Param('file_id', ParseIntPipe) fileId: number,
    @Body() body?: { scan_type?: string },
  ) {
    await this.fileWorkflow.startFileScan(fileId, body?.scan_type);
    return { success: true };
  }

  /**
   * POST /v1/files/:file_id/scan-results
   * FileScan.Record - Record scan result
   */
  @Post('files/:file_id/scan-results')
  async recordFileScan(
    @Param('file_id', ParseIntPipe) fileId: number,
    @Body() request: FileScanRecordRequestDto,
  ) {
    return this.fileWorkflow.recordFileScan(fileId, request);
  }

  /**
   * POST /v1/files/:file_id/scan/clean
   * FileScan.MarkClean - Mark file as clean
   */
  @Post('files/:file_id/scan/clean')
  async markFileClean(@Param('file_id', ParseIntPipe) fileId: number) {
    await this.fileWorkflow.markFileClean(fileId);
    return { success: true };
  }

  /**
   * POST /v1/files/:file_id/scan/infected
   * FileScan.MarkInfected - Mark file as infected
   */
  @Post('files/:file_id/scan/infected')
  async markFileInfected(
    @Param('file_id', ParseIntPipe) fileId: number,
    @Body() body?: { reason?: string },
  ) {
    await this.fileWorkflow.markFileInfected(fileId, body?.reason);
    return { success: true };
  }

  /**
   * POST /v1/file-tags
   * FileTag.Create - Create new file tag
   */
  @Post('file-tags')
  async createFileTag(@Body() request: FileTagCreateRequestDto) {
    return this.fileWorkflow.createFileTag(request);
  }

  /**
   * POST /v1/files/:file_id/tags
   * FileTag.Assign - Assign tag to file
   */
  @Post('files/:file_id/tags')
  async assignFileTag(
    @Param('file_id', ParseIntPipe) fileId: number,
    @Body() request: FileTagAssignRequestDto,
  ) {
    return this.fileWorkflow.assignFileTag(fileId, request);
  }

  /**
   * DELETE /v1/files/:file_id/tags/:tag_id
   * FileTag.Unassign - Remove tag from file
   */
  @Delete('files/:file_id/tags/:tag_id')
  async unassignFileTag(
    @Param('file_id', ParseIntPipe) fileId: number,
    @Param('tag_id', ParseIntPipe) tagId: number,
  ) {
    await this.fileWorkflow.unassignFileTag(fileId, tagId);
    return { success: true };
  }
}
