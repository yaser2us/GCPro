import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MissionDefinition } from './entities/mission-definition.entity';
import { MissionAssignment } from './entities/mission-assignment.entity';
import { MissionSubmission } from './entities/mission-submission.entity';
import { MissionRewardGrant } from './entities/mission-reward-grant.entity';
import { MissionDefinitionRepository } from './repositories/mission-definition.repo';
import { MissionAssignmentRepository } from './repositories/mission-assignment.repo';
import { MissionSubmissionRepository } from './repositories/mission-submission.repo';
import { MissionRewardGrantRepository } from './repositories/mission-reward-grant.repo';
import { MissionsWorkflowService } from './services/missions.workflow.service';
import { MissionsController } from './controllers/missions.controller';

/**
 * Missions Module
 * Encapsulates all mission-related functionality
 *
 * Based on specs/mission/mission.pillar.yml
 */
@Module({
  imports: [
    // Register Mission entities with TypeORM
    TypeOrmModule.forFeature([
      MissionDefinition,
      MissionAssignment,
      MissionSubmission,
      MissionRewardGrant,
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
    // Services (business logic)
    MissionsWorkflowService,
  ],
  exports: [
    // Export services in case other modules need them
    MissionsWorkflowService,
  ],
})
export class MissionsModule {}
