import { Controller, Post, Get, Body, Param, Headers, ParseIntPipe } from '@nestjs/common';
import { ReferralWorkflowService } from '../services/referral.workflow.service';
import { ReferralChainService } from '../services/referral-chain.service';
import { ReferralProgramCreateRequestDto } from '../dto/referral-program-create.request.dto';
import { ReferralProgramPauseRequestDto } from '../dto/referral-program-pause.request.dto';
import { ReferralCodeCreateRequestDto } from '../dto/referral-code-create.request.dto';
import { ReferralInviteCreateRequestDto } from '../dto/referral-invite-create.request.dto';
import { ReferralInviteClickRequestDto } from '../dto/referral-invite-click.request.dto';
import { ReferralConversionCreateRequestDto } from '../dto/referral-conversion-create.request.dto';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * Referral Controller V2
 * Multi-Level Referral API Endpoints
 *
 * Base Path: /v2/referral
 *
 * Key Differences from V1 (/v1/referral):
 * - Automatically builds multi-level referral chains
 * - Provides network statistics endpoints
 * - Returns referral tree/downline information
 *
 * Backward Compatibility:
 * - All V1 endpoints work the same way
 * - V2 adds chain building via event consumer
 * - Use V2 if you need multi-level commission tracking
 * - Use V1 if you only need single-level referrals
 */
@Controller('v2/referral')
export class ReferralV2Controller {
  constructor(
    private readonly workflowService: ReferralWorkflowService,
    private readonly chainService: ReferralChainService,
  ) {}

  /**
   * Create actor from request headers
   */
  private createActor(headers: any): Actor {
    return {
      actor_user_id: headers['x-user-id'] || 'anonymous',
      actor_role: headers['x-user-role'] || 'user',
      correlation_id: headers['x-correlation-id'] || undefined,
      causation_id: headers['x-causation-id'] || undefined,
    };
  }

  // ============================================================================
  // PROGRAM ENDPOINTS (Same as V1)
  // ============================================================================

  /**
   * POST /v2/referral/programs
   * Create referral program
   */
  @Post('programs')
  async createProgram(
    @Body() request: ReferralProgramCreateRequestDto,
    @Headers() headers: any,
  ) {
    const actor = this.createActor(headers);
    const idempotencyKey = headers['idempotency-key'] || `create-program-${Date.now()}`;

    return this.workflowService.createReferralProgram(request, actor, idempotencyKey);
  }

  /**
   * POST /v2/referral/programs/:id/pause
   * Pause referral program
   */
  @Post('programs/:id/pause')
  async pauseProgram(
    @Param('id', ParseIntPipe) id: number,
    @Body() request: ReferralProgramPauseRequestDto,
    @Headers() headers: any,
  ) {
    const actor = this.createActor(headers);
    const idempotencyKey = headers['idempotency-key'] || `pause-program-${id}-${Date.now()}`;

    return this.workflowService.pauseReferralProgram(id, request, actor, idempotencyKey);
  }

  /**
   * POST /v2/referral/programs/:id/activate
   * Activate referral program
   */
  @Post('programs/:id/activate')
  async activateProgram(
    @Param('id', ParseIntPipe) id: number,
    @Headers() headers: any,
  ) {
    const actor = this.createActor(headers);
    const idempotencyKey = headers['idempotency-key'] || `activate-program-${id}-${Date.now()}`;

    return this.workflowService.activateReferralProgram(id, actor, idempotencyKey);
  }

  // ============================================================================
  // CODE ENDPOINTS (Same as V1)
  // ============================================================================

  /**
   * POST /v2/referral/codes
   * Create referral code
   */
  @Post('codes')
  async createCode(
    @Body() request: ReferralCodeCreateRequestDto,
    @Headers() headers: any,
  ) {
    const actor = this.createActor(headers);
    const idempotencyKey = headers['idempotency-key'] || `create-code-${Date.now()}`;

    return this.workflowService.createReferralCode(request, actor, idempotencyKey);
  }

  // ============================================================================
  // INVITE ENDPOINTS (Same as V1)
  // ============================================================================

  /**
   * POST /v2/referral/invites
   * Create referral invite
   */
  @Post('invites')
  async createInvite(
    @Body() request: ReferralInviteCreateRequestDto,
    @Headers() headers: any,
  ) {
    const actor = this.createActor(headers);
    const idempotencyKey = headers['idempotency-key'] || `create-invite-${Date.now()}`;

    return this.workflowService.createReferralInvite(request, actor, idempotencyKey);
  }

  /**
   * POST /v2/referral/invites/click
   * Record invite click
   */
  @Post('invites/click')
  async clickInvite(
    @Body() request: ReferralInviteClickRequestDto,
    @Headers() headers: any,
  ) {
    const actor = this.createActor(headers);
    const idempotencyKey = headers['idempotency-key'] || `click-invite-${Date.now()}`;

    return this.workflowService.clickReferralInvite(request, actor, idempotencyKey);
  }

  // ============================================================================
  // CONVERSION ENDPOINTS (Same as V1, but triggers chain building)
  // ============================================================================

  /**
   * POST /v2/referral/conversions
   * Record referral conversion
   *
   * V2 Enhancement: Automatically builds multi-level chain via event consumer
   */
  @Post('conversions')
  async createConversion(
    @Body() request: ReferralConversionCreateRequestDto,
    @Headers() headers: any,
  ) {
    const actor = this.createActor(headers);
    const idempotencyKey = headers['idempotency-key'] || `create-conversion-${Date.now()}`;

    return this.workflowService.createReferralConversion(request, actor, idempotencyKey);
  }

  // ============================================================================
  // V2-SPECIFIC ENDPOINTS (Multi-Level Features)
  // ============================================================================

  /**
   * GET /v2/referral/programs/:program_id/users/:user_id/network
   * Get referral network statistics
   *
   * V2 Only: Returns multi-level network stats
   *
   * Response:
   * {
   *   "total_descendants": 10,
   *   "level_1_count": 3,
   *   "level_2_count": 5,
   *   "level_3_count": 2
   * }
   */
  @Get('programs/:program_id/users/:user_id/network')
  async getNetworkStats(
    @Param('program_id', ParseIntPipe) program_id: number,
    @Param('user_id', ParseIntPipe) user_id: number,
  ) {
    return this.chainService.getNetworkStats(program_id, user_id);
  }

  /**
   * GET /v2/referral/programs/:program_id/users/:user_id/downline
   * Get full referral downline (all descendants)
   *
   * V2 Only: Returns entire referral tree
   *
   * Query Params:
   * - max_depth: Maximum depth to retrieve (default: 3)
   *
   * Response:
   * {
   *   "downline": [
   *     { "user_id": 200, "depth": 1 },
   *     { "user_id": 300, "depth": 2 },
   *     { "user_id": 400, "depth": 3 }
   *   ]
   * }
   */
  @Get('programs/:program_id/users/:user_id/downline')
  async getDownline(
    @Param('program_id', ParseIntPipe) program_id: number,
    @Param('user_id', ParseIntPipe) user_id: number,
  ) {
    const downline = await this.chainService.getReferralTree(program_id, user_id, 3);

    return {
      downline,
      total_count: downline.length,
    };
  }

  /**
   * GET /v2/referral/programs/:program_id/users/:user_id/upline
   * Get referral upline (all ancestors)
   *
   * V2 Only: Returns all users who referred this user (directly or indirectly)
   *
   * Query Params:
   * - max_depth: Maximum depth to retrieve (default: 3)
   *
   * Response:
   * {
   *   "upline": [
   *     { "user_id": 100, "depth": 1 },
   *     { "user_id": 50, "depth": 2 },
   *     { "user_id": 25, "depth": 3 }
   *   ]
   * }
   */
  @Get('programs/:program_id/users/:user_id/upline')
  async getUpline(
    @Param('program_id', ParseIntPipe) program_id: number,
    @Param('user_id', ParseIntPipe) user_id: number,
  ) {
    const upline = await this.chainService.getCommissionEligibleAncestors(
      program_id,
      user_id,
      3,
    );

    return {
      upline,
      total_count: upline.length,
    };
  }
}
