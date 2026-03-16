/**
 * Missions Plugin - Barrel Exports
 * Based on specs/mission/missions.pillar.v2.yml
 */

// Module
export { MissionsModule } from './missions.module';

// Entities
export { MissionDefinition } from './entities/mission-definition.entity';
export { MissionAssignment } from './entities/mission-assignment.entity';
export { MissionEvent } from './entities/mission-event.entity';
export { MissionProgress } from './entities/mission-progress.entity';
export { MissionSubmission } from './entities/mission-submission.entity';
export { MissionSubmissionFile } from './entities/mission-submission-file.entity';
export { MissionRewardGrant } from './entities/mission-reward-grant.entity';

// DTOs
export { MissionDefinitionCreateRequestDto } from './dto/mission-definition-create.request.dto';
export { MissionDefinitionPublishRequestDto } from './dto/mission-definition-publish.request.dto';
export { MissionDefinitionStateChangeRequestDto } from './dto/mission-definition-state-change.request.dto';
export { MissionAssignRequestDto } from './dto/mission-assign.request.dto';
export { MissionSubmitRequestDto } from './dto/mission-submit.request.dto';
export { MissionSubmissionReviewRequestDto, MissionApproveSubmissionRequestDto } from './dto/mission-approve-submission.request.dto';
export { MissionProgressRecordRequestDto } from './dto/mission-progress-record.request.dto';

// Services
export { MissionsWorkflowService } from './services/missions.workflow.service';

// Controllers
export { MissionsController } from './controllers/missions.controller';

// Repositories
export { MissionDefinitionRepository } from './repositories/mission-definition.repo';
export { MissionAssignmentRepository } from './repositories/mission-assignment.repo';
export { MissionEventRepository } from './repositories/mission-event.repo';
export { MissionProgressRepository } from './repositories/mission-progress.repo';
export { MissionSubmissionRepository } from './repositories/mission-submission.repo';
export { MissionSubmissionFileRepository } from './repositories/mission-submission-file.repo';
export { MissionRewardGrantRepository } from './repositories/mission-reward-grant.repo';
