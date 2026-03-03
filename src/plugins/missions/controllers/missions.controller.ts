import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MissionsWorkflowService } from '../services/missions.workflow.service';
import { MissionApproveSubmissionRequestDto } from '../dto/mission-approve-submission.request.dto';
import { MissionPublishRequestDto } from '../dto/mission-publish.request.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * Missions Controller
 * Handles HTTP endpoints for mission operations
 *
 * Based on mission.pillar.yml commands section
 */
@ApiTags('Missions')
@Controller('/v1/missions')
@UseGuards(AuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class MissionsController {
  constructor(private readonly workflowService: MissionsWorkflowService) {}

  /**
   * PUBLISH MISSION ENDPOINT
   *
   * Spec: mission.pillar.yml line 254
   * HTTP: POST /v1/missions/{mission_id}/publish
   * Permissions: missions:admin OR missions:manage
   *
   * Example request:
   * POST /v1/missions/123e4567-e89b-12d3-a456-426614174000/publish
   * Headers:
   *   X-User-Id: admin-user-123
   *   X-User-Role: ADMIN
   * Body:
   * {
   *   "idempotency_key": "publish_mission_abc_20240315"
   * }
   *
   * Example response:
   * {
   *   "mission_id": "123e4567-e89b-12d3-a456-426614174000",
   *   "status": "PUBLISHED"
   * }
   */
  @Post(':mission_id/publish')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('missions:admin', 'missions:manage') // ANY of these
  @ApiOperation({
    summary: 'Publish a mission',
    description:
      'Publishes a draft or paused mission, making it available for enrollment',
  })
  @ApiResponse({
    status: 200,
    description: 'Mission published successfully',
    schema: {
      example: {
        mission_id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'PUBLISHED',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Mission not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Mission not publishable (wrong status or already ended)',
  })
  @ApiResponse({
    status: 403,
    description: 'User lacks required permissions',
  })
  async publishMission(
    @Param('mission_id') mission_id: string,
    @Body() request: MissionPublishRequestDto,
    @CurrentActor() actor: Actor,
  ) {
    return this.workflowService.publishMission(mission_id, request, actor);
  }

  /**
   * APPROVE SUBMISSION ENDPOINT
   *
   * Spec: mission.pillar.yml line 515
   * HTTP: POST /v1/missions/{mission_id}/submissions/{submission_id}/approve
   * Permissions: missions:admin OR missions:review
   *
   * Example request:
   * POST /v1/missions/123e4567-e89b-12d3-a456-426614174000/submissions/987f6543-e21b-43d1-b098-765432109876/approve
   * Headers:
   *   X-User-Id: admin-user-123
   *   X-User-Role: ADMIN
   * Body:
   * {
   *   "idempotency_key": "approve_sub_xyz_20240315_001",
   *   "approval_note": "Great submission!"
   * }
   *
   * Example response:
   * {
   *   "submission_id": "987f6543-e21b-43d1-b098-765432109876",
   *   "submission_status": "APPROVED",
   *   "enrollment_id": "456f7890-a12b-34c5-d678-901234567890",
   *   "enrollment_status": "COMPLETED"
   * }
   */
  @Post(':mission_id/submissions/:submission_id/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('missions:admin', 'missions:review') // ANY of these
  @ApiOperation({
    summary: 'Approve a mission submission',
    description:
      'Approves a pending mission submission, completes the enrollment, and requests reward payout',
  })
  @ApiResponse({
    status: 200,
    description: 'Submission approved successfully',
    schema: {
      example: {
        submission_id: '987f6543-e21b-43d1-b098-765432109876',
        submission_status: 'APPROVED',
        enrollment_id: '456f7890-a12b-34c5-d678-901234567890',
        enrollment_status: 'COMPLETED',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Mission, submission, or enrollment not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Submission not approvable (wrong status)',
  })
  @ApiResponse({
    status: 403,
    description: 'User lacks required permissions',
  })
  async approveSubmission(
    @Param('mission_id') mission_id: string,
    @Param('submission_id') submission_id: string,
    @Body() request: MissionApproveSubmissionRequestDto,
    @CurrentActor() actor: Actor,
  ) {
    return this.workflowService.approveSubmission(
      mission_id,
      submission_id,
      request,
      actor,
    );
  }
}
