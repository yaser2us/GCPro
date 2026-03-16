import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { OutboxService } from '../../../corekit/services/outbox.service';
import { PersonRepository } from '../repositories/person.repo';
import { PersonIdentityRepository } from '../repositories/person-identity.repo';
import { PersonRelationshipRepository } from '../repositories/person-relationship.repo';
import { PersonCreateRequestDto } from '../dto/person-create.request.dto';
import { PersonUpdateRequestDto } from '../dto/person-update.request.dto';
import { PersonIdentityAddRequestDto } from '../dto/person-identity-add.request.dto';
import { PersonRelationshipCreateRequestDto } from '../dto/person-relationship-create.request.dto';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * Person Workflow Service
 * Implements person commands following the workflow discipline:
 * Guard → Validate → Write → Emit → Commit
 *
 * Based on specs/person/person.pillar.v2.yml
 */
@Injectable()
export class PersonWorkflowService {
  constructor(
    private readonly txService: TransactionService,
    private readonly outboxService: OutboxService,
    private readonly personRepo: PersonRepository,
    private readonly personIdentityRepo: PersonIdentityRepository,
    private readonly personRelationshipRepo: PersonRelationshipRepository,
  ) {}

  /**
   * PERSON.CREATE COMMAND
   * Source: specs/person/person.pillar.v2.yml
   *
   * HTTP: POST /v1/persons
   * Idempotency: Via Idempotency-Key header
   */
  async createPerson(
    request: PersonCreateRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: required fields
      if (!request.type || request.type === '') {
        throw new BadRequestException({
          code: 'PERSON_TYPE_REQUIRED',
          message: 'Person type is required',
        });
      }

      if (!request.full_name || request.full_name === '') {
        throw new BadRequestException({
          code: 'PERSON_FULL_NAME_REQUIRED',
          message: 'Full name is required',
        });
      }

      // WRITE: create person
      const personId = await this.personRepo.create(
        {
          primary_user_id: request.primary_user_id
            ? Number(request.primary_user_id)
            : null,
          type: request.type,
          full_name: request.full_name,
          dob: request.dob ? new Date(request.dob) : null,
          gender: request.gender || null,
          nationality: request.nationality || null,
          status: 'active',
        },
        queryRunner,
      );

      // EMIT: PERSON_CREATED event
      await this.outboxService.enqueue(
        {
          event_name: 'PERSON_CREATED',
          event_version: 1,
          aggregate_type: 'PERSON',
          aggregate_id: String(personId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            person_id: personId,
            type: request.type,
            full_name: request.full_name,
          },
        },
        queryRunner,
      );

      return {
        person_id: personId,
        status: 'active',
      };
    });

    return result;
  }

  /**
   * PERSON.GET COMMAND
   * Source: specs/person/person.pillar.v2.yml
   *
   * HTTP: GET /v1/persons/{person_id}
   */
  async getPerson(id: number) {
    const person = await this.personRepo.findById(id);

    if (!person) {
      throw new NotFoundException({
        code: 'PERSON_NOT_FOUND',
        message: `Person with id ${id} not found`,
      });
    }

    return person;
  }

  /**
   * PERSON.LIST COMMAND
   * Source: specs/person/person.pillar.v2.yml
   *
   * HTTP: GET /v1/persons
   */
  async listPersons() {
    const persons = await this.personRepo.findAll();
    return { items: persons };
  }

  /**
   * PERSON.UPDATE COMMAND
   * Source: specs/person/person.pillar.v2.yml
   *
   * HTTP: PUT /v1/persons/{person_id}
   */
  async updatePerson(
    id: number,
    request: PersonUpdateRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: person exists
      const person = await this.personRepo.findById(id, queryRunner);
      if (!person) {
        throw new NotFoundException({
          code: 'PERSON_NOT_FOUND',
          message: `Person with id ${id} not found`,
        });
      }

      // WRITE: update person
      const updateData: any = {};
      if (request.full_name !== undefined)
        updateData.full_name = request.full_name;
      if (request.dob !== undefined)
        updateData.dob = request.dob ? new Date(request.dob) : null;
      if (request.gender !== undefined) updateData.gender = request.gender;
      if (request.nationality !== undefined)
        updateData.nationality = request.nationality;

      await this.personRepo.update(id, updateData, queryRunner);

      // EMIT: PERSON_UPDATED event
      await this.outboxService.enqueue(
        {
          event_name: 'PERSON_UPDATED',
          event_version: 1,
          aggregate_type: 'PERSON',
          aggregate_id: String(id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            person_id: id,
          },
        },
        queryRunner,
      );

      return {
        person_id: id,
      };
    });

    return result;
  }

  /**
   * PERSON.DEACTIVATE COMMAND
   * Source: specs/person/person.pillar.v2.yml
   *
   * HTTP: POST /v1/persons/{person_id}/deactivate
   */
  async deactivatePerson(
    id: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: person exists
      const person = await this.personRepo.findById(id, queryRunner);
      if (!person) {
        throw new NotFoundException({
          code: 'PERSON_NOT_FOUND',
          message: `Person with id ${id} not found`,
        });
      }

      // GUARD: person must be active
      if (person.status !== 'active') {
        throw new ConflictException({
          code: 'PERSON_NOT_ACTIVE',
          message: `Person is not active, current status: ${person.status}`,
        });
      }

      // WRITE: update person to inactive
      await this.personRepo.update(id, { status: 'inactive' }, queryRunner);

      // EMIT: PERSON_DEACTIVATED event
      await this.outboxService.enqueue(
        {
          event_name: 'PERSON_DEACTIVATED',
          event_version: 1,
          aggregate_type: 'PERSON',
          aggregate_id: String(id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            person_id: id,
          },
        },
        queryRunner,
      );

      return {
        person_id: id,
        status: 'inactive',
      };
    });

    return result;
  }

  /**
   * PERSON.MARK_DECEASED COMMAND
   * Source: specs/person/person.pillar.v2.yml
   *
   * HTTP: POST /v1/persons/{person_id}/deceased
   */
  async markPersonDeceased(
    id: number,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: person exists
      const person = await this.personRepo.findById(id, queryRunner);
      if (!person) {
        throw new NotFoundException({
          code: 'PERSON_NOT_FOUND',
          message: `Person with id ${id} not found`,
        });
      }

      // GUARD: person must not already be deceased
      if (person.status === 'deceased') {
        throw new ConflictException({
          code: 'PERSON_ALREADY_DECEASED',
          message: 'Person is already marked as deceased',
        });
      }

      // WRITE: update person to deceased
      await this.personRepo.update(id, { status: 'deceased' }, queryRunner);

      // EMIT: PERSON_DECEASED event
      await this.outboxService.enqueue(
        {
          event_name: 'PERSON_DECEASED',
          event_version: 1,
          aggregate_type: 'PERSON',
          aggregate_id: String(id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            person_id: id,
          },
        },
        queryRunner,
      );

      return {
        person_id: id,
        status: 'deceased',
      };
    });

    return result;
  }

  /**
   * PERSON_IDENTITY.ADD COMMAND
   * Source: specs/person/person.pillar.v2.yml
   *
   * HTTP: POST /v1/persons/{person_id}/identities
   */
  async addPersonIdentity(
    personId: number,
    request: PersonIdentityAddRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: person exists
      const person = await this.personRepo.findById(personId, queryRunner);
      if (!person) {
        throw new NotFoundException({
          code: 'PERSON_NOT_FOUND',
          message: `Person with id ${personId} not found`,
        });
      }

      // GUARD: required fields
      if (!request.id_type || request.id_type === '') {
        throw new BadRequestException({
          code: 'ID_TYPE_REQUIRED',
          message: 'Identity type is required',
        });
      }

      if (!request.id_no || request.id_no === '') {
        throw new BadRequestException({
          code: 'ID_NO_REQUIRED',
          message: 'Identity number is required',
        });
      }

      // WRITE: upsert person identity
      const personIdentityId = await this.personIdentityRepo.upsert(
        {
          person_id: personId,
          id_type: request.id_type,
          id_no: request.id_no,
          country: request.country || null,
        },
        queryRunner,
      );

      // EMIT: PERSON_IDENTITY_ADDED event
      await this.outboxService.enqueue(
        {
          event_name: 'PERSON_IDENTITY_ADDED',
          event_version: 1,
          aggregate_type: 'PERSON',
          aggregate_id: String(personId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            person_id: personId,
            person_identity_id: personIdentityId,
            id_type: request.id_type,
            id_no: request.id_no,
          },
        },
        queryRunner,
      );

      return {
        person_identity_id: personIdentityId,
      };
    });

    return result;
  }

  /**
   * PERSON_IDENTITY.LIST COMMAND
   * Source: specs/person/person.pillar.v2.yml
   *
   * HTTP: GET /v1/persons/{person_id}/identities
   */
  async listPersonIdentities(personId: number) {
    // GUARD: person exists
    const person = await this.personRepo.findById(personId);
    if (!person) {
      throw new NotFoundException({
        code: 'PERSON_NOT_FOUND',
        message: `Person with id ${personId} not found`,
      });
    }

    // READ: get identities
    const identities = await this.personIdentityRepo.findByPersonId(personId);

    return { items: identities };
  }

  /**
   * PERSON_RELATIONSHIP.CREATE COMMAND
   * Source: specs/person/person.pillar.v2.yml
   *
   * HTTP: POST /v1/persons/{person_id}/relationships
   */
  async createPersonRelationship(
    fromPersonId: number,
    request: PersonRelationshipCreateRequestDto,
    actor: Actor,
    idempotencyKey: string,
  ) {
    const result = await this.txService.run(async (queryRunner) => {
      // GUARD: from_person exists
      const fromPerson = await this.personRepo.findById(
        fromPersonId,
        queryRunner,
      );
      if (!fromPerson) {
        throw new NotFoundException({
          code: 'PERSON_NOT_FOUND',
          message: `Person with id ${fromPersonId} not found`,
        });
      }

      // GUARD: to_person exists
      const toPerson = await this.personRepo.findById(
        Number(request.to_person_id),
        queryRunner,
      );
      if (!toPerson) {
        throw new NotFoundException({
          code: 'TO_PERSON_NOT_FOUND',
          message: `Person with id ${request.to_person_id} not found`,
        });
      }

      // GUARD: relation_type is required
      if (!request.relation_type || request.relation_type === '') {
        throw new BadRequestException({
          code: 'RELATION_TYPE_REQUIRED',
          message: 'Relationship type is required',
        });
      }

      // WRITE: upsert person relationship
      const personRelationshipId = await this.personRelationshipRepo.upsert(
        {
          from_person_id: fromPersonId,
          to_person_id: Number(request.to_person_id),
          relation_type: request.relation_type,
        },
        queryRunner,
      );

      // EMIT: PERSON_RELATIONSHIP_CREATED event
      await this.outboxService.enqueue(
        {
          event_name: 'PERSON_RELATIONSHIP_CREATED',
          event_version: 1,
          aggregate_type: 'PERSON',
          aggregate_id: String(fromPersonId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            person_relationship_id: personRelationshipId,
            from_person_id: fromPersonId,
            to_person_id: Number(request.to_person_id),
            relation_type: request.relation_type,
          },
        },
        queryRunner,
      );

      return {
        person_relationship_id: personRelationshipId,
      };
    });

    return result;
  }

  /**
   * PERSON_RELATIONSHIP.LIST COMMAND
   * Source: specs/person/person.pillar.v2.yml
   *
   * HTTP: GET /v1/persons/{person_id}/relationships
   */
  async listPersonRelationships(personId: number) {
    // GUARD: person exists
    const person = await this.personRepo.findById(personId);
    if (!person) {
      throw new NotFoundException({
        code: 'PERSON_NOT_FOUND',
        message: `Person with id ${personId} not found`,
      });
    }

    // READ: get relationships
    const relationships =
      await this.personRelationshipRepo.findByPersonId(personId);

    return { items: relationships };
  }
}
