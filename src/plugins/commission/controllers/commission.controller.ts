import {
  Controller,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { CommissionWorkflowService } from '../services/commission.workflow.service';
import { CreateProgramRequestDto } from '../dto/create-program.request.dto';
import { EnrollParticipantRequestDto } from '../dto/enroll-participant.request.dto';
import { CreateRuleRequestDto } from '../dto/create-rule.request.dto';
import { RecordAccrualRequestDto } from '../dto/record-accrual.request.dto';
import { CreatePayoutBatchRequestDto } from '../dto/create-payout-batch.request.dto';
import { UpdateParticipantStatusRequestDto } from '../dto/update-participant-status.request.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * Commission Controller
 * Handles HTTP endpoints for commission operations
 *
 * Based on specs/commission/commission.pillar.v2.yml commands section
 */
@Controller('/api/commission')
@UseGuards(AuthGuard, PermissionsGuard)
export class CommissionController {
  constructor(private readonly workflowService: CommissionWorkflowService) {}

  /**
   * CREATE PROGRAM ENDPOINT
   * Spec: specs/commission/commission.pillar.v2.yml lines 1117-1144
   */
  @Post('programs')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('commission:admin', 'commission:manager')
  async createProgram(
    @Body() request: CreateProgramRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.createProgram(
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * PAUSE PROGRAM ENDPOINT
   * Spec: specs/commission/commission.pillar.v2.yml lines 1182-1211
   */
  @Post('programs/:id/pause')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('commission:admin', 'commission:manager')
  async pauseProgram(
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.pauseProgram(
      Number(id),
      actor,
      idempotencyKey,
    );
  }

  /**
   * ACTIVATE PROGRAM ENDPOINT
   * Spec: specs/commission/commission.pillar.v2.yml lines 1213-1242
   */
  @Post('programs/:id/activate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('commission:admin', 'commission:manager')
  async activateProgram(
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.activateProgram(
      Number(id),
      actor,
      idempotencyKey,
    );
  }

  /**
   * ENROLL PARTICIPANT ENDPOINT
   * Spec: specs/commission/commission.pillar.v2.yml lines 1244-1280
   */
  @Post('programs/:program_id/participants')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('commission:admin', 'commission:manager')
  async enrollParticipant(
    @Param('program_id') programId: string,
    @Body() request: EnrollParticipantRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    request.program_id = Number(programId);

    return this.workflowService.enrollParticipant(
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * UPDATE PARTICIPANT STATUS ENDPOINT
   * Spec: specs/commission/commission.pillar.v2.yml lines 1282-1315
   */
  @Put('participants/:id/status')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('commission:admin', 'commission:manager')
  async updateParticipantStatus(
    @Param('id') id: string,
    @Body() request: UpdateParticipantStatusRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.updateParticipantStatus(
      Number(id),
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * CREATE RULE ENDPOINT
   * Spec: specs/commission/commission.pillar.v2.yml lines 1317-1357
   */
  @Post('programs/:program_id/rules')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('commission:admin', 'commission:manager')
  async createRule(
    @Param('program_id') programId: string,
    @Body() request: CreateRuleRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    request.program_id = Number(programId);

    return this.workflowService.createRule(
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * RECORD ACCRUAL ENDPOINT
   * Spec: specs/commission/commission.pillar.v2.yml lines 1403-1449
   */
  @Post('accruals')
  @HttpCode(HttpStatus.CREATED)
  async recordAccrual(
    @Body() request: RecordAccrualRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.recordAccrual(
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * VOID ACCRUAL ENDPOINT
   * Spec: specs/commission/commission.pillar.v2.yml lines 1451-1482
   */
  @Put('accruals/:id/void')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('commission:admin', 'commission:manager')
  async voidAccrual(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.voidAccrual(
      Number(id),
      reason,
      actor,
      idempotencyKey,
    );
  }

  /**
   * CREATE PAYOUT BATCH ENDPOINT
   * Spec: specs/commission/commission.pillar.v2.yml lines 1484-1520
   */
  @Post('programs/:program_id/payout-batches')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('commission:admin', 'commission:manager')
  async createPayoutBatch(
    @Param('program_id') programId: string,
    @Body() request: CreatePayoutBatchRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    request.program_id = Number(programId);

    return this.workflowService.createPayoutBatch(
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * PROCESS PAYOUT BATCH ENDPOINT
   * Spec: specs/commission/commission.pillar.v2.yml lines 1522-1562
   */
  @Post('payout-batches/:id/process')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('commission:admin', 'commission:manager')
  async processPayoutBatch(
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.processPayoutBatch(
      Number(id),
      actor,
      idempotencyKey,
    );
  }
}
