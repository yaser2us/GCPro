/**
 * Person Plugin
 * Exports all public interfaces from the person module
 *
 * Based on specs/person/person.pillar.v2.yml
 */

export { PersonModule } from './person.module';
export { PersonWorkflowService } from './services/person.workflow.service';

// Entities
export { Person } from './entities/person.entity';
export { PersonIdentity } from './entities/person-identity.entity';
export { PersonRelationship } from './entities/person-relationship.entity';

// DTOs
export { PersonCreateRequestDto } from './dto/person-create.request.dto';
export { PersonUpdateRequestDto } from './dto/person-update.request.dto';
export { PersonIdentityAddRequestDto } from './dto/person-identity-add.request.dto';
export { PersonRelationshipCreateRequestDto } from './dto/person-relationship-create.request.dto';
