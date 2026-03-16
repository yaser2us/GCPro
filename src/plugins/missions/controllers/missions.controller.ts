import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { MissionsWorkflowService } from '../services/missions.workflow.service';
import { MissionDefinitionCreateRequestDto } from '../dto/mission-definition-create.request.dto';
import { MissionDefinitionPublishRequestDto } from '../dto/mission-definition-publish.request.dto';
import { MissionDefinitionStateChangeRequestDto } from '../dto/mission-definition-state-change.request.dto';
import { MissionAssignRequestDto } from '../dto/mission-assign.request.dto';
import { MissionSubmitRequestDto } from '../dto/mission-submit.request.dto';
import { MissionApproveSubmissionRequestDto as MissionSubmissionReviewRequestDto } from '../dto/mission-approve-submission.request.dto';
import { MissionProgressRecordRequestDto } from '../dto/mission-progress-record.request.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * Missions Controller
 * Handles HTTP endpoints for mission operations
 *
 * Based on specs/mission/mission.pillar.yml commands section
 */
@Controller('/v1/missions')
@UseGuards(AuthGuard, PermissionsGuard)
export class MissionsController {
  constructor(private readonly workflowService: MissionsWorkflowService) {}

  /**
   * PUBLISH MISSION DEFINITION ENDPOINT
   *
   * Spec: specs/mission/mission.pillar.yml lines 178-208
   * HTTP: POST /v1/missions/definitions/{id}/publish
   * Permissions: missions:admin OR missions:manage
   *
   * Example request:
   * POST /v1/missions/definitions/123/publish
   * Headers:
   *   X-User-Id: admin-user-123
   *   X-User-Role: ADMIN
   *   Idempotency-Key: publish-mission-123-xyz
   * Body: {}
   *
   * Example response:
   * {
   *   "mission_definition_id": 123,
   *   "status": "published"
   * }
   */
  @Post('definitions/:id/publish')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('missions:admin', 'missions:manage')
  async publishMissionDefinition(
    @Param('id') id: string,
    @Body() request: MissionDefinitionPublishRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.publishMissionDefinition(
      Number(id),
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * APPROVE SUBMISSION ENDPOINT
   *
   * Spec: specs/mission/mission.pillar.yml lines 349-456
   * HTTP: POST /v1/missions/submissions/{submission_id}/approve
   * Permissions: missions:admin OR missions:review
   *
   * Example request:
   * POST /v1/missions/submissions/456/approve
   * Headers:
   *   X-User-Id: admin-user-123
   *   X-User-Role: ADMIN
   *   Idempotency-Key: approve-submission-456-xyz
   * Body:
   * {
   *   "feedback": "Great work!"
   * }
   *
   * Example response:
   * {
   *   "submission_id": 456,
   *   "submission_status": "approved",
   *   "assignment_id": 789,
   *   "assignment_status": "completed",
   *   "reward_grant_id": 1011,
   *   "reward_status": "requested"
   * }
   */
  @Post('submissions/:submission_id/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('missions:admin', 'missions:review')
  async approveSubmission(
    @Param('submission_id') submission_id: string,
    @Body() request: MissionSubmissionReviewRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.approveSubmission(
      Number(submission_id),
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * CREATE MISSION DEFINITION ENDPOINT
   *
   * Spec: specs/mission/mission.pillar.yml lines 131-176
   * HTTP: POST /v1/missions/definitions
   * Permissions: missions:admin OR missions:manage
   *
   * Example request:
   * POST /v1/missions/definitions
   * Headers:
   *   X-User-Id: admin-123
   *   X-User-Role: ADMIN
   *   Idempotency-Key: create-mission-xyz
   * Body:
   * {
   *   "code": "POLICY_5X",
   *   "title": "Complete 5 Policy Applications",
   *   "description": "Submit and get approved for 5 policy applications",
   *   "cadence": "one_time",
   *   "max_per_user": 1,
   *   "reward_json": {"reward_type":"FIXED","amount":50,"currency":"MYR"}
   * }
   *
   * Example response:
   * {
   *   "mission_definition_id": 123,
   *   "status": "draft"
   * }
   */
  @Post('definitions')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('missions:admin', 'missions:manage')
  async createMissionDefinition(
    @Body() request: MissionDefinitionCreateRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.createMissionDefinition(
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * ASSIGN MISSION ENDPOINT
   *
   * Spec: specs/mission/missions.pillar.v2.yml lines 1097-1155
   * HTTP: POST /v1/missions/definitions/{mission_definition_id}/assignments
   * Permissions: missions:admin OR missions:manage OR missions:enroll
   *
   * Example request:
   * POST /v1/missions/definitions/123/assignments
   * Headers:
   *   X-User-Id: user-456
   *   X-User-Role: USER
   *   Idempotency-Key: assign-mission-123-user-456
   * Body:
   * {
   *   "user_id": "456"
   * }
   *
   * Example response:
   * {
   *   "assignment_id": "789",
   *   "mission_id": "123",
   *   "user_id": "456",
   *   "status": "assigned"
   * }
   */
  @Post('definitions/:mission_definition_id/assignments')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('missions:admin', 'missions:manage', 'missions:enroll')
  async assignMission(
    @Param('mission_definition_id') mission_definition_id: string,
    @Body() request: MissionAssignRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.assignMission(
      Number(mission_definition_id),
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * SUBMIT MISSION ENDPOINT
   *
   * Spec: specs/mission/missions.pillar.v2.yml lines 1269-1332
   * HTTP: POST /v1/missions/assignments/{assignment_id}/submissions
   * Permissions: missions:enroll (user submitting their own work)
   *
   * Example request:
   * POST /v1/missions/assignments/789/submissions
   * Headers:
   *   X-User-Id: user-456
   *   X-User-Role: USER
   *   Idempotency-Key: submit-assignment-789
   * Body:
   * {
   *   "text_content": "I completed 5 policy applications!",
   *   "meta_json": {"file_ids": ["file-123", "file-456"]}
   * }
   *
   * Example response:
   * {
   *   "submission_id": "1011",
   *   "assignment_id": "789",
   *   "status": "pending"
   * }
   */
  @Post('assignments/:assignment_id/submissions')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('missions:enroll')
  async submitMission(
    @Param('assignment_id') assignment_id: string,
    @Body() request: MissionSubmitRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.submitMission(
      Number(assignment_id),
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * GET MISSION DEFINITION ENDPOINT
   *
   * Spec: specs/mission/mission.pillar.yml lines 336-354
   * HTTP: GET /v1/missions/definitions/{mission_definition_id}
   * Permissions: missions:read OR missions:admin
   *
   * Example request:
   * GET /v1/missions/definitions/123
   * Headers:
   *   X-User-Id: user-456
   *   X-User-Role: USER
   *
   * Example response:
   * {
   *   "id": 123,
   *   "code": "POLICY_5X",
   *   "name": "Complete 5 Policy Applications",
   *   "status": "published",
   *   ...
   * }
   */
  @Get('definitions/:mission_definition_id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('missions:read', 'missions:admin')
  async getMissionDefinition(
    @Param('mission_definition_id') mission_definition_id: string,
    @CurrentActor() actor: Actor,
  ) {
    return this.workflowService.getMissionDefinition(Number(mission_definition_id));
  }

  /**
   * LIST MISSION DEFINITIONS ENDPOINT
   *
   * Spec: specs/mission/mission.pillar.yml lines 356-369
   * HTTP: GET /v1/missions/definitions
   * Permissions: missions:read OR missions:admin
   *
   * Example request:
   * GET /v1/missions/definitions
   * Headers:
   *   X-User-Id: user-456
   *   X-User-Role: USER
   *
   * Example response:
   * {
   *   "items": [
   *     { "id": 123, "code": "POLICY_5X", "name": "...", "status": "published" },
   *     { "id": 124, "code": "KYC_VERIFY", "name": "...", "status": "draft" }
   *   ]
   * }
   */
  @Get('definitions')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('missions:read', 'missions:admin')
  async listMissionDefinitions(@CurrentActor() actor: Actor) {
    return this.workflowService.listMissionDefinitions();
  }

  /**
   * GET MISSION ASSIGNMENT ENDPOINT
   *
   * Spec: specs/mission/mission.pillar.yml lines 579-598
   * HTTP: GET /v1/missions/assignments/{assignment_id}
   * Permissions: missions:read OR missions:admin OR missions:enroll
   *
   * Example request:
   * GET /v1/missions/assignments/789
   * Headers:
   *   X-User-Id: user-456
   *   X-User-Role: USER
   *
   * Example response:
   * {
   *   "id": 789,
   *   "mission_id": 123,
   *   "user_id": 456,
   *   "status": "assigned",
   *   ...
   * }
   */
  @Get('assignments/:assignment_id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('missions:read', 'missions:admin', 'missions:enroll')
  async getMissionAssignment(
    @Param('assignment_id') assignment_id: string,
    @CurrentActor() actor: Actor,
  ) {
    return this.workflowService.getMissionAssignment(Number(assignment_id));
  }

  /**
   * LIST MISSION ASSIGNMENTS BY USER ENDPOINT
   *
   * Spec: specs/mission/missions.pillar.v2.yml lines 1179-1197
   * HTTP: GET /v1/users/{user_id}/mission-assignments
   * Permissions: missions:read OR missions:admin OR missions:enroll
   *
   * Example request:
   * GET /v1/users/456/mission-assignments
   * Headers:
   *   X-User-Id: user-456
   *   X-User-Role: USER
   *
   * Example response:
   * {
   *   "items": [
   *     { "id": 789, "mission_id": 123, "user_id": 456, "status": "assigned" },
   *     { "id": 790, "mission_id": 124, "user_id": 456, "status": "completed" }
   *   ]
   * }
   */
  @Get('../users/:user_id/mission-assignments')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('missions:read', 'missions:admin', 'missions:enroll')
  async listMissionAssignmentsByUser(
    @Param('user_id') user_id: string,
    @CurrentActor() actor: Actor,
  ) {
    return this.workflowService.listMissionAssignmentsByUser(Number(user_id));
  }

  /**
   * GET MISSION SUBMISSION ENDPOINT
   *
   * Spec: specs/mission/mission.pillar.yml lines 748-766
   * HTTP: GET /v1/missions/submissions/{submission_id}
   * Permissions: missions:read OR missions:admin OR missions:review
   *
   * Example request:
   * GET /v1/missions/submissions/1011
   * Headers:
   *   X-User-Id: admin-123
   *   X-User-Role: ADMIN
   *
   * Example response:
   * {
   *   "id": 1011,
   *   "assignment_id": 789,
   *   "status": "pending",
   *   "content_json": {...},
   *   ...
   * }
   */
  @Get('submissions/:submission_id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('missions:read', 'missions:admin', 'missions:review')
  async getMissionSubmission(
    @Param('submission_id') submission_id: string,
    @CurrentActor() actor: Actor,
  ) {
    return this.workflowService.getMissionSubmission(Number(submission_id));
  }

  /**
   * GET REWARD GRANT BY ASSIGNMENT ENDPOINT
   *
   * Spec: specs/mission/mission.pillar.yml lines 979-992
   * HTTP: GET /v1/missions/assignments/{assignment_id}/reward-grant
   * Permissions: missions:read OR missions:admin
   *
   * Example request:
   * GET /v1/missions/assignments/789/reward-grant
   * Headers:
   *   X-User-Id: user-456
   *   X-User-Role: USER
   *
   * Example response:
   * {
   *   "id": 1011,
   *   "assignment_id": 789,
   *   "user_id": 456,
   *   "amount": 50,
   *   "status": "requested",
   *   ...
   * }
   */
  @Get('assignments/:assignment_id/reward-grant')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('missions:read', 'missions:admin')
  async getRewardGrantByAssignment(
    @Param('assignment_id') assignment_id: string,
    @CurrentActor() actor: Actor,
  ) {
    return this.workflowService.getRewardGrantByAssignment(Number(assignment_id));
  }

  /**
   * LIST EVENTS BY ASSIGNMENT ENDPOINT
   *
   * Spec: specs/mission/mission.pillar.yml lines 994-1008
   * HTTP: GET /v1/missions/assignments/{assignment_id}/events
   * Permissions: missions:read OR missions:admin
   *
   * Example request:
   * GET /v1/missions/assignments/789/events
   * Headers:
   *   X-User-Id: user-456
   *   X-User-Role: USER
   *
   * Example response:
   * {
   *   "items": [
   *     { "id": 1, "event_type": "assigned", "created_at": "2025-01-15T10:00:00Z" },
   *     { "id": 2, "event_type": "submitted", "created_at": "2025-01-16T14:30:00Z" }
   *   ]
   * }
   */
  @Get('assignments/:assignment_id/events')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('missions:read', 'missions:admin')
  async listEventsByAssignment(
    @Param('assignment_id') assignment_id: string,
    @CurrentActor() actor: Actor,
  ) {
    return this.workflowService.listEventsByAssignment(Number(assignment_id));
  }

  /**
   * RECORD MISSION PROGRESS ENDPOINT
   *
   * Spec: specs/mission/missions.pillar.v2.yml lines 1198-1268
   * HTTP: POST /v1/missions/assignments/{assignment_id}/progress
   * Permissions: missions:enroll OR missions:admin
   */
  @Post('assignments/:assignment_id/progress')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('missions:enroll', 'missions:admin')
  async recordMissionProgress(
    @Param('assignment_id') assignment_id: string,
    @Body() request: MissionProgressRecordRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.recordMissionProgress(
      Number(assignment_id),
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * PAUSE MISSION DEFINITION ENDPOINT
   *
   * Spec: specs/mission/missions.pillar.v2.yml lines 962-1006
   * HTTP: POST /v1/missions/definitions/{mission_definition_id}/pause
   * Permissions: missions:admin OR missions:manage
   */
  @Post('definitions/:mission_definition_id/pause')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('missions:admin', 'missions:manage')
  async pauseMissionDefinition(
    @Param('mission_definition_id') mission_definition_id: string,
    @Body() request: MissionDefinitionStateChangeRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.pauseMissionDefinition(
      Number(mission_definition_id),
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * RETIRE MISSION DEFINITION ENDPOINT
   *
   * Spec: specs/mission/missions.pillar.v2.yml lines 1052-1095
   * HTTP: POST /v1/missions/definitions/{mission_definition_id}/retire
   * Permissions: missions:admin OR missions:manage
   */
  @Post('definitions/:mission_definition_id/retire')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('missions:admin', 'missions:manage')
  async retireMissionDefinition(
    @Param('mission_definition_id') mission_definition_id: string,
    @Body() request: MissionDefinitionStateChangeRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.retireMissionDefinition(
      Number(mission_definition_id),
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * REJECT SUBMISSION ENDPOINT
   *
   * Spec: specs/mission/missions.pillar.v2.yml lines 1475-1550
   * HTTP: POST /v1/missions/submissions/{submission_id}/reject
   * Permissions: missions:admin OR missions:review
   */
  @Post('submissions/:submission_id/reject')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('missions:admin', 'missions:review')
  async rejectSubmission(
    @Param('submission_id') submission_id: string,
    @Body() request: MissionSubmissionReviewRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.rejectSubmission(
      Number(submission_id),
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * LIST SUBMISSION FILES ENDPOINT
   *
   * Spec: specs/mission/missions.pillar.v2.yml lines 1551-1569
   * HTTP: GET /v1/missions/submissions/{submission_id}/files
   * Permissions: missions:read OR missions:admin OR missions:review
   */
  @Get('submissions/:submission_id/files')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('missions:read', 'missions:admin', 'missions:review')
  async listSubmissionFiles(
    @Param('submission_id') submission_id: string,
    @CurrentActor() actor: Actor,
  ) {
    return this.workflowService.listSubmissionFiles(Number(submission_id));
  }

  /**
   * LIST PROGRESS BY ASSIGNMENT ENDPOINT
   *
   * HTTP: GET /v1/missions/assignments/{assignment_id}/progress
   * Permissions: missions:read OR missions:admin OR missions:enroll
   */
  @Get('assignments/:assignment_id/progress')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('missions:read', 'missions:admin', 'missions:enroll')
  async listProgressByAssignment(
    @Param('assignment_id') assignment_id: string,
    @CurrentActor() actor: Actor,
  ) {
    return this.workflowService.listProgressByAssignment(Number(assignment_id));
  }
}
