import {
  Controller,
  Post,
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
import { MissionAssignRequestDto } from '../dto/mission-assign.request.dto';
import { MissionSubmitRequestDto } from '../dto/mission-submit.request.dto';
import { MissionApproveSubmissionRequestDto } from '../dto/mission-approve-submission.request.dto';
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
   *   "id": 123,
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
    @Body() request: MissionApproveSubmissionRequestDto,
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
   *   "id": 123,
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
   * Spec: specs/mission/mission.pillar.yml lines 210-269
   * HTTP: POST /v1/missions/definitions/{definition_id}/assign
   * Permissions: missions:admin OR missions:manage OR missions:enroll
   *
   * Example request:
   * POST /v1/missions/definitions/123/assign
   * Headers:
   *   X-User-Id: user-456
   *   X-User-Role: USER
   *   Idempotency-Key: assign-mission-123-user-456
   * Body:
   * {
   *   "user_id": 456,
   *   "assignment_type": "self_enroll"
   * }
   *
   * Example response:
   * {
   *   "assignment_id": 789,
   *   "status": "assigned"
   * }
   */
  @Post('definitions/:definition_id/assign')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('missions:admin', 'missions:manage', 'missions:enroll')
  async assignMission(
    @Param('definition_id') definition_id: string,
    @Body() request: MissionAssignRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.assignMission(
      Number(definition_id),
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * SUBMIT MISSION ENDPOINT
   *
   * Spec: specs/mission/mission.pillar.yml lines 271-347
   * HTTP: POST /v1/missions/assignments/{assignment_id}/submit
   * Permissions: missions:enroll (user submitting their own work)
   *
   * Example request:
   * POST /v1/missions/assignments/789/submit
   * Headers:
   *   X-User-Id: user-456
   *   X-User-Role: USER
   *   Idempotency-Key: submit-assignment-789
   * Body:
   * {
   *   "text_content": "I completed 5 policy applications!",
   *   "meta_json": {"notes": "All applications were approved"}
   * }
   *
   * Example response:
   * {
   *   "submission_id": 1011,
   *   "status": "pending"
   * }
   */
  @Post('assignments/:assignment_id/submit')
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
}
