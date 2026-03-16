import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { PersonWorkflowService } from '../services/person.workflow.service';
import { PersonCreateRequestDto } from '../dto/person-create.request.dto';
import { PersonUpdateRequestDto } from '../dto/person-update.request.dto';
import { PersonIdentityAddRequestDto } from '../dto/person-identity-add.request.dto';
import { PersonRelationshipCreateRequestDto } from '../dto/person-relationship-create.request.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * Person Controller
 * Handles HTTP endpoints for person operations
 *
 * Based on specs/person/person.pillar.v2.yml commands section
 */
@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class PersonController {
  constructor(private readonly workflowService: PersonWorkflowService) {}

  // ──────────────────────────────────────────────────────────────────────────
  // PERSON ENDPOINTS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * CREATE PERSON
   * POST /v1/persons
   */
  @Post('v1/persons')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('person:admin', 'person:manage')
  async createPerson(
    @Body() request: PersonCreateRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.createPerson(request, actor, idempotencyKey);
  }

  /**
   * GET PERSON
   * GET /v1/persons/:person_id
   */
  @Get('v1/persons/:person_id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('person:read')
  async getPerson(@Param('person_id') personId: string) {
    return this.workflowService.getPerson(Number(personId));
  }

  /**
   * LIST PERSONS
   * GET /v1/persons
   */
  @Get('v1/persons')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('person:read')
  async listPersons() {
    return this.workflowService.listPersons();
  }

  /**
   * UPDATE PERSON
   * PUT /v1/persons/:person_id
   */
  @Put('v1/persons/:person_id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('person:admin', 'person:manage')
  async updatePerson(
    @Param('person_id') personId: string,
    @Body() request: PersonUpdateRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.updatePerson(
      Number(personId),
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * DEACTIVATE PERSON
   * POST /v1/persons/:person_id/deactivate
   */
  @Post('v1/persons/:person_id/deactivate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('person:admin')
  async deactivatePerson(
    @Param('person_id') personId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.deactivatePerson(
      Number(personId),
      actor,
      idempotencyKey,
    );
  }

  /**
   * MARK PERSON DECEASED
   * POST /v1/persons/:person_id/deceased
   */
  @Post('v1/persons/:person_id/deceased')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('person:admin')
  async markPersonDeceased(
    @Param('person_id') personId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.markPersonDeceased(
      Number(personId),
      actor,
      idempotencyKey,
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PERSON IDENTITY ENDPOINTS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * ADD PERSON IDENTITY
   * POST /v1/persons/:person_id/identities
   */
  @Post('v1/persons/:person_id/identities')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('person:admin', 'person:manage')
  async addPersonIdentity(
    @Param('person_id') personId: string,
    @Body() request: PersonIdentityAddRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.addPersonIdentity(
      Number(personId),
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * LIST PERSON IDENTITIES
   * GET /v1/persons/:person_id/identities
   */
  @Get('v1/persons/:person_id/identities')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('person:read')
  async listPersonIdentities(@Param('person_id') personId: string) {
    return this.workflowService.listPersonIdentities(Number(personId));
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PERSON RELATIONSHIP ENDPOINTS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * CREATE PERSON RELATIONSHIP
   * POST /v1/persons/:person_id/relationships
   */
  @Post('v1/persons/:person_id/relationships')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('person:admin', 'person:manage')
  async createPersonRelationship(
    @Param('person_id') personId: string,
    @Body() request: PersonRelationshipCreateRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.createPersonRelationship(
      Number(personId),
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * LIST PERSON RELATIONSHIPS
   * GET /v1/persons/:person_id/relationships
   */
  @Get('v1/persons/:person_id/relationships')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('person:read')
  async listPersonRelationships(@Param('person_id') personId: string) {
    return this.workflowService.listPersonRelationships(Number(personId));
  }
}
