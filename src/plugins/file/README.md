# File Plugin

**Source:** `specs/file/file.pillar.v2.yml`

Provides comprehensive file lifecycle management for the GCPro platform, including upload tracking, version control, virus scanning, access tokens, polymorphic linking, and tagging.

## Overview

The File plugin manages the complete lifecycle of files from creation through upload, scanning, and eventual deletion. It supports:

- **File Lifecycle**: created → uploaded → scanning → clean/infected → deleted
- **Version Control**: Snapshot file versions for audit trail
- **Access Tokens**: Temporary token-based file access with expiration and usage limits
- **Virus Scanning**: Integration with antivirus providers (ClamAV, VirusTotal, etc.)
- **Polymorphic Linking**: Link files to any entity type (missions, persons, etc.)
- **Tagging**: Organize files with custom tags
- **Event Tracking**: Complete audit trail of all file operations

## Data Model

### Entities (8 Tables)

1. **file_upload** - Main file records
   - Lifecycle states: created, uploaded, scanning, clean, infected, failed
   - Storage metadata: provider, bucket, path
   - File metadata: name, size, mime_type, md5_hash
   - Soft deletion support with deleted_at

2. **file_version** - Version snapshots
   - Immutable snapshots of file state
   - Sequential version_number tracking
   - Full file metadata preservation

3. **file_access_token** - Temporary access tokens
   - Token-based file access control
   - Expiration timestamps
   - Usage limits and tracking
   - Revocation support

4. **file_event** - Audit trail
   - Complete event history
   - User attribution
   - JSON event_data for metadata

5. **file_link** - Polymorphic entity links
   - Links files to any entity via (target_type, target_id)
   - Optional role_code for context
   - UNIQUE constraint for idempotency

6. **file_scan_result** - Virus scan results
   - Multiple scan types: antivirus, malware, content
   - Provider tracking (ClamAV, VirusTotal, etc.)
   - Status: clean, infected, error
   - Optional summary field

7. **file_tag** - Tag definitions
   - Reusable tag vocabulary
   - UNIQUE code for idempotency

8. **file_upload_tag** - Tag assignments
   - Many-to-many file-tag relationships
   - UNIQUE(file_id, tag_id) for idempotency

## Commands (18)

### File Upload Management

1. **FileUpload.Create** - Create new upload record
   - Generates unique file_key
   - Sets status='created'
   - Prepares upload slot

2. **FileUpload.Complete** - Mark upload complete
   - Updates storage metadata
   - Sets status='uploaded'
   - Triggers scan workflow

3. **FileUpload.Fail** - Mark upload failed
   - Sets status='failed'
   - Records failure reason

4. **FileUpload.Delete** - Soft delete file
   - Sets deleted_at timestamp
   - Preserves for audit

### Version Control

5. **FileVersion.Create** - Snapshot file state
   - Auto-increments version_number
   - Captures complete file metadata
   - Immutable historical record

### Access Tokens

6. **FileAccessToken.Generate** - Create access token
   - Generates cryptographically secure token
   - Optional expiration (expires_in_seconds)
   - Optional usage limits (max_uses)

7. **FileAccessToken.Validate** - Validate token
   - Checks expiration, revocation, usage limits
   - Optionally increments usage counter
   - Returns file_id if valid

8. **FileAccessToken.Revoke** - Revoke token
   - Sets revoked_at timestamp
   - Immediately invalidates token

### Event Tracking

9. **FileEvent.Record** - Record custom event
   - Flexible event_type field
   - Optional JSON event_data
   - User attribution support

### File Linking

10. **FileLink.Create** - Link file to entity
    - Polymorphic target (any entity type)
    - Optional role_code for context
    - Idempotent via UNIQUE constraint

11. **FileLink.Remove** - Remove file link
    - Hard delete link record
    - Does not affect file itself

### Virus Scanning

12. **FileScan.Start** - Initiate scan
    - Sets status='scanning'
    - Configurable scan_type

13. **FileScan.Record** - Record scan result
    - Stores provider response
    - Captures status and summary

14. **FileScan.MarkClean** - Mark as clean
    - Sets status='clean'
    - File ready for use

15. **FileScan.MarkInfected** - Mark as infected
    - Sets status='infected'
    - File quarantined

### Tagging

16. **FileTag.Create** - Create tag definition
    - Idempotent via UNIQUE(code)
    - Reusable tag vocabulary

17. **FileTag.Assign** - Assign tag to file
    - Idempotent via UNIQUE(file_id, tag_id)
    - Many-to-many relationship

18. **FileTag.Unassign** - Remove tag from file
    - Hard delete assignment
    - Tag definition preserved

## HTTP Endpoints (18)

### File Upload Management

```
POST   /v1/files                           FileUpload.Create
POST   /v1/files/:file_id/complete         FileUpload.Complete
POST   /v1/files/:file_id/fail             FileUpload.Fail
DELETE /v1/files/:file_id                  FileUpload.Delete
```

### Version Control

```
POST   /v1/files/:file_id/versions         FileVersion.Create
```

### Access Tokens

```
POST   /v1/files/:file_id/tokens           FileAccessToken.Generate
POST   /v1/file-tokens/validate            FileAccessToken.Validate
POST   /v1/file-tokens/revoke              FileAccessToken.Revoke
```

### Event Tracking

```
POST   /v1/files/:file_id/events           FileEvent.Record
```

### File Linking

```
POST   /v1/files/:file_id/links            FileLink.Create
DELETE /v1/file-links/:link_id             FileLink.Remove
```

### Virus Scanning

```
POST   /v1/files/:file_id/scan/start       FileScan.Start
POST   /v1/files/:file_id/scan-results     FileScan.Record
POST   /v1/files/:file_id/scan/clean       FileScan.MarkClean
POST   /v1/files/:file_id/scan/infected    FileScan.MarkInfected
```

### Tagging

```
POST   /v1/file-tags                       FileTag.Create
POST   /v1/files/:file_id/tags             FileTag.Assign
DELETE /v1/files/:file_id/tags/:tag_id     FileTag.Unassign
```

## Events (12)

All events are stored in `file_event` table with automatic user attribution and timestamps:

```
FileUpload.Created       - Upload record created
FileUpload.Completed     - Upload finished successfully
FileUpload.Failed        - Upload failed
FileUpload.Deleted       - File soft deleted
FileVersion.Created      - Version snapshot created
FileAccessToken.Generated - Access token created
FileAccessToken.Used     - Token validated with usage increment
FileAccessToken.Revoked  - Token revoked
FileLink.Created         - File linked to entity
FileLink.Removed         - Link removed
FileScan.Started         - Virus scan initiated
FileScan.Recorded        - Scan result stored
FileScan.Clean           - File marked clean
FileScan.Infected        - File marked infected
FileTag.Assigned         - Tag assigned to file
FileTag.Unassigned       - Tag removed from file
```

## Idempotency

The File plugin ensures idempotency through multiple mechanisms:

1. **UNIQUE Constraints**:
   - `file_upload.file_key` - Prevents duplicate uploads
   - `file_tag.code` - Prevents duplicate tag definitions
   - `file_upload_tag(file_id, tag_id)` - Prevents duplicate tag assignments
   - `file_link(file_id, target_type, target_id, role_code)` - Prevents duplicate links

2. **Idempotency-Key Header**: Required for:
   - FileAccessToken.Generate
   - FileScan.Record

3. **Upsert Operations**: Repository methods use ON DUPLICATE KEY UPDATE pattern

## Typical Workflows

### Upload Flow

1. Client calls `FileUpload.Create` → receives file_key and upload URL
2. Client uploads file to storage (S3, etc.)
3. Client calls `FileUpload.Complete` with storage metadata
4. System calls `FileScan.Start` → status='scanning'
5. Background worker calls `FileScan.Record` with scan results
6. System calls `FileScan.MarkClean` or `FileScan.MarkInfected`
7. File ready for use if clean

### Temporary Access

1. System calls `FileAccessToken.Generate` with expiration
2. Token shared with external party
3. External party calls `FileAccessToken.Validate` with token
4. System checks expiration, usage limits, revocation
5. If valid, grants access and optionally increments usage
6. Token auto-expires or can be revoked via `FileAccessToken.Revoke`

### Polymorphic Linking

1. Mission needs to attach files
2. System calls `FileLink.Create` with target_type='mission', target_id='123'
3. Optional role_code='proof' for semantic meaning
4. Query all files for mission: `WHERE target_type='mission' AND target_id='123'`
5. Remove link when no longer needed: `FileLink.Remove`

## Security Considerations

1. **Token Security**: Access tokens use cryptographically secure random bytes (128 hex chars)
2. **Virus Scanning**: Files must pass scanning before status='clean'
3. **Soft Deletion**: Files are soft-deleted to preserve audit trail
4. **User Attribution**: All operations track triggered_by_user_id
5. **Event Audit**: Complete event history in file_event table

## Storage Integration

The plugin is storage-agnostic. Integration points:

- `storage_provider`: 's3', 'gcs', 'azure', etc.
- `storage_bucket`: Bucket/container name
- `storage_path`: Object key/path

Actual storage operations (presigned URLs, uploads) handled by separate storage service.

## Virus Scanning Integration

The plugin provides hooks for virus scanning:

- `FileScan.Start` - Initiate scan
- `FileScan.Record` - Record provider response
- Background workers call scan providers (ClamAV, VirusTotal, etc.)
- Results stored in `file_scan_result` table

## Module Structure

```
src/plugins/file/
├── entities/           8 entity files
├── dto/                7 request DTOs
├── repositories/       8 repository files
├── services/           file.workflow.service.ts (18 commands)
├── controllers/        file.controller.ts (18 endpoints)
├── file.module.ts      Module definition
├── index.ts            Barrel exports
└── README.md           This file
```

## Usage Example

```typescript
// Inject the workflow service
constructor(private readonly fileWorkflow: FileWorkflowService) {}

// Create upload slot
const { file_id, file_key } = await this.fileWorkflow.createFileUpload({
  storage_provider: 's3',
  storage_bucket: 'my-bucket',
  uploaded_by_user_id: 42,
});

// Complete upload
await this.fileWorkflow.completeFileUpload(file_id, {
  storage_path: 'uploads/2024/file.pdf',
  file_name: 'document.pdf',
  file_size: 1024000,
  mime_type: 'application/pdf',
  md5_hash: 'abc123...',
});

// Generate temporary access token (expires in 1 hour, max 3 uses)
const { token } = await this.fileWorkflow.generateFileAccessToken(file_id, {
  token_type: 'download',
  expires_in_seconds: 3600,
  max_uses: 3,
});

// Link file to mission
await this.fileWorkflow.createFileLink(file_id, {
  target_type: 'mission',
  target_id: '123',
  role_code: 'proof',
});

// Tag file
const { tag_id } = await this.fileWorkflow.createFileTag({
  code: 'confidential',
  name: 'Confidential Document',
});
await this.fileWorkflow.assignFileTag(file_id, { tag_id: tag_id.toString() });
```

## Dependencies

- **NestJS**: Framework
- **TypeORM**: ORM
- **class-validator**: DTO validation
- **crypto**: Secure token generation (Node.js built-in)

## P0 Foundation Pillar

This plugin is part of the **P0 Foundation** pillars (defined in `P0-PILLAR-BUILD-PLAN.md`):

- Permission Management ✅
- Person Management ✅
- User Management ✅
- **File Management** ✅ (this plugin)
- Notification (pending)

The File plugin provides essential file management capabilities that other pillars and plugins can build upon.
