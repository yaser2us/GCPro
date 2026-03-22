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
import { WalletAdvancedWorkflowService } from '../services/wallet-advanced.workflow.service';
import { RuleSetCreateDto } from '../dto/rule-set-create.dto';
import { RuleAddDto } from '../dto/rule-add.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * WalletRuleSetController
 * Handles wallet rule set lifecycle: create, add rules, deactivate.
 * Based on specs/wallet-advanced/wallet-advanced.pillar.v2.yml
 */
@Controller('/api/v1/wallet-advanced')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('wallet-advanced:admin')
export class WalletRuleSetController {
  constructor(private readonly workflowService: WalletAdvancedWorkflowService) {}

  /** POST /api/v1/wallet-advanced/rule-sets */
  @Post('rule-sets')
  @HttpCode(HttpStatus.CREATED)
  async createRuleSet(
    @Body() dto: RuleSetCreateDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.createRuleSet(dto, actor, idempotencyKey);
  }

  /** POST /api/v1/wallet-advanced/rule-sets/:ruleSetId/rules */
  @Post('rule-sets/:ruleSetId/rules')
  @HttpCode(HttpStatus.CREATED)
  async addRule(
    @Param('ruleSetId') ruleSetId: string,
    @Body() dto: RuleAddDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.addRule(Number(ruleSetId), dto, actor, idempotencyKey);
  }

  /** POST /api/v1/wallet-advanced/rule-sets/:ruleSetId/deactivate */
  @Post('rule-sets/:ruleSetId/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivateRuleSet(
    @Param('ruleSetId') ruleSetId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.deactivateRuleSet(Number(ruleSetId), actor, idempotencyKey);
  }
}
