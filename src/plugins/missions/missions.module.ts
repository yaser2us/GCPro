import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MissionDefinition } from './entities/mission-definition.entity';
import { MissionAssignment } from './entities/mission-assignment.entity';
import { MissionSubmission } from './entities/mission-submission.entity';
import { MissionRewardGrant } from './entities/mission-reward-grant.entity';
import { MissionEvent } from './entities/mission-event.entity';
import { MissionProgress } from './entities/mission-progress.entity';
import { MissionSubmissionFile } from './entities/mission-submission-file.entity';
import { MissionDefinitionRepository } from './repositories/mission-definition.repo';
import { MissionAssignmentRepository } from './repositories/mission-assignment.repo';
import { MissionSubmissionRepository } from './repositories/mission-submission.repo';
import { MissionRewardGrantRepository } from './repositories/mission-reward-grant.repo';
import { MissionEventRepository } from './repositories/mission-event.repo';
import { MissionProgressRepository } from './repositories/mission-progress.repo';
import { MissionSubmissionFileRepository } from './repositories/mission-submission-file.repo';
import { MissionsWorkflowService } from './services/missions.workflow.service';
import { MissionsController } from './controllers/missions.controller';

/**
 * Missions Module
 * Encapsulates all mission-related functionality
 *
 * Based on specs/mission/missions.pillar.v2.yml
 */
@Module({
  imports: [
    // Register Mission entities with TypeORM
    TypeOrmModule.forFeature([
      MissionDefinition,
      MissionAssignment,
      MissionSubmission,
      MissionRewardGrant,
      MissionEvent,
      MissionProgress,
      MissionSubmissionFile,
    ]),
  ],
  controllers: [
    // HTTP controllers
    MissionsController,
  ],
  providers: [
    // Repositories (data access)
    MissionDefinitionRepository,
    MissionAssignmentRepository,
    MissionSubmissionRepository,
    MissionRewardGrantRepository,
    MissionEventRepository,
    MissionProgressRepository,
    MissionSubmissionFileRepository,
    // Services (business logic)
    MissionsWorkflowService,
  ],
  exports: [
    // Export services in case other modules need them
    MissionsWorkflowService,
  ],
})
export class MissionsModule {}
