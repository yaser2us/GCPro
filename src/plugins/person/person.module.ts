import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Person } from './entities/person.entity';
import { PersonIdentity } from './entities/person-identity.entity';
import { PersonRelationship } from './entities/person-relationship.entity';
import { PersonRepository } from './repositories/person.repo';
import { PersonIdentityRepository } from './repositories/person-identity.repo';
import { PersonRelationshipRepository } from './repositories/person-relationship.repo';
import { PersonWorkflowService } from './services/person.workflow.service';
import { PersonController } from './controllers/person.controller';

/**
 * Person Module
 * Encapsulates all person-related functionality
 *
 * Based on specs/person/person.pillar.v2.yml
 */
@Module({
  imports: [
    // Register Person entities with TypeORM
    TypeOrmModule.forFeature([Person, PersonIdentity, PersonRelationship]),
  ],
  controllers: [
    // HTTP controllers
    PersonController,
  ],
  providers: [
    // Repositories (data access)
    PersonRepository,
    PersonIdentityRepository,
    PersonRelationshipRepository,
    // Services (business logic)
    PersonWorkflowService,
  ],
  exports: [
    // Export services in case other modules need them
    PersonWorkflowService,
  ],
})
export class PersonModule {}
