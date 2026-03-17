/**
 * Referral Plugin Exports
 * Based on specs/referral/referral.pillar.yml
 */

// Module
export { ReferralModule } from './referral.module';

// Entities
export { ReferralProgram } from './entities/referral-program.entity';
export { ReferralCode } from './entities/referral-code.entity';
export { ReferralInvite } from './entities/referral-invite.entity';
export { ReferralRule } from './entities/referral-rule.entity';
export { ReferralConversion } from './entities/referral-conversion.entity';
export { ReferralEvent } from './entities/referral-event.entity';
export { ReferralRewardGrant } from './entities/referral-reward-grant.entity';
export { ReferralChain } from './entities/referral-chain.entity';

// DTOs
export { ReferralProgramCreateRequestDto } from './dto/referral-program-create.request.dto';
export { ReferralProgramPauseRequestDto } from './dto/referral-program-pause.request.dto';
export { ReferralCodeCreateRequestDto } from './dto/referral-code-create.request.dto';
export { ReferralInviteCreateRequestDto } from './dto/referral-invite-create.request.dto';
export { ReferralInviteClickRequestDto } from './dto/referral-invite-click.request.dto';
export { ReferralConversionCreateRequestDto } from './dto/referral-conversion-create.request.dto';

// Repositories
export { ReferralProgramRepository } from './repositories/referral-program.repo';
export { ReferralCodeRepository } from './repositories/referral-code.repo';
export { ReferralInviteRepository } from './repositories/referral-invite.repo';
export { ReferralConversionRepository } from './repositories/referral-conversion.repo';
export { ReferralRewardGrantRepository } from './repositories/referral-reward-grant.repo';
export { ReferralEventRepository } from './repositories/referral-event.repo';

// Services
export { ReferralWorkflowService } from './services/referral.workflow.service';

// Controller
export { ReferralController } from './controllers/referral.controller';
