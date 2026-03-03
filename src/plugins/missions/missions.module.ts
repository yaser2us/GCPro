import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mission } from './entities/mission.entity';
import { MissionEnrollment } from './entities/mission-enrollment.entity';
import { MissionSubmission } from './entities/mission-submission.entity';
import { MissionsRepository } from './repositories/missions.repo';
import { EnrollmentsRepository } from './repositories/enrollments.repo';
import { SubmissionsRepository } from './repositories/submissions.repo';
import { MissionsWorkflowService } from './services/missions.workflow.service';
import { MissionsController } from './controllers/missions.controller';

/**
 * Missions Module
 * Encapsulates all mission-related functionality
 *
 * Based on mission.pillar.yml
 */
@Module({
  imports: [
    // Register Mission entities with TypeORM
    TypeOrmModule.forFeature([Mission, MissionEnrollment, MissionSubmission]),
  ],
  controllers: [
    // HTTP controllers
    MissionsController,
  ],
  providers: [
    // Repositories (data access)
    MissionsRepository,
    EnrollmentsRepository,
    SubmissionsRepository,
    // Services (business logic)
    MissionsWorkflowService,
  ],
  exports: [
    // Export services in case other modules need them
    MissionsWorkflowService,
  ],
})
export class MissionsModule {}
