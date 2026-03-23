import { Injectable, Logger } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { OutboxService } from '../../../corekit/services/outbox.service';
import { ReferralChainRepository } from '../repositories/referral-chain.repo';

// Program code priority for affiliate chain inheritance: abl > referral > agent
const PROGRAM_PRIORITY: Record<string, number> = {
  abl: 1,
  referral: 2,
  agent: 3,
};

function programPriority(code: string): number {
  const lower = (code ?? '').toLowerCase();
  for (const [key, rank] of Object.entries(PROGRAM_PRIORITY)) {
    if (lower.includes(key)) return rank;
  }
  return 99; // unknown programs are lowest priority
}

/**
 * PolicyMemberAddedHandler
 * H3 — Affiliate Code Inheritance
 *
 * When a dependent or beneficiary is added to a policy, inherit the policy holder's
 * referral chain so the new member is linked to the same upline network.
 *
 * Priority for program selection: abl > referral > agent
 *
 * Algorithm:
 * 1. Skip if role is 'holder' (only dependents/beneficiaries inherit)
 * 2. Resolve holder user_id via policy_member JOIN person WHERE role='holder'
 * 3. Resolve new member user_id via person.primary_user_id
 * 4. Find all holder's ancestor chains across all programs (raw SQL JOIN referral_program)
 * 5. Sort by program priority (abl > referral > agent)
 * 6. Upsert chain entries for the new member (same ancestor, same depth, same root refs)
 * 7. Emit AFFILIATE_CHAIN_INHERITED
 */
@Injectable()
export class PolicyMemberAddedHandler {
  private readonly logger = new Logger(PolicyMemberAddedHandler.name);

  constructor(
    private readonly chainRepo: ReferralChainRepository,
    private readonly outboxService: OutboxService,
  ) {}

  async handle(
    event: {
      policy_member_id: number;
      policy_id: number | string;
      person_id: number | string;
      role: string;
    },
    queryRunner: QueryRunner,
  ): Promise<void> {
    const { policy_id, person_id, role } = event;

    // Only process dependents and beneficiaries
    if (role === 'holder') {
      this.logger.log(`[H3] Skipping holder for policy_id=${policy_id}`);
      return;
    }

    // 1. Resolve holder user_id
    const holderRows = await queryRunner.manager.query(
      `SELECT p.primary_user_id AS user_id
       FROM policy_member pm
       JOIN person p ON p.id = pm.person_id
       WHERE pm.policy_id = ? AND pm.role = 'holder' AND pm.status = 'active'
       LIMIT 1`,
      [policy_id],
    );

    if (!holderRows?.length || !holderRows[0].user_id) {
      this.logger.warn(`[H3] No holder user found for policy_id=${policy_id}, skipping`);
      return;
    }
    const holderUserId = Number(holderRows[0].user_id);

    // 2. Resolve new member user_id
    const memberRows = await queryRunner.manager.query(
      `SELECT primary_user_id AS user_id FROM person WHERE id = ? LIMIT 1`,
      [person_id],
    );

    if (!memberRows?.length || !memberRows[0].user_id) {
      this.logger.warn(`[H3] No user_id for person_id=${person_id}, skipping`);
      return;
    }
    const memberUserId = Number(memberRows[0].user_id);

    // Skip self-inheritance (should not happen, guard anyway)
    if (holderUserId === memberUserId) return;

    // 3. Find holder's ancestor chains with program code (for priority sorting)
    const ancestorRows: Array<{
      program_id: number;
      program_code: string;
      ancestor_user_id: number;
      depth: number;
      root_invite_id: number | null;
      root_conversion_id: number | null;
    }> = await queryRunner.manager.query(
      `SELECT
         rc.program_id,
         rp.code AS program_code,
         rc.ancestor_user_id,
         rc.depth,
         rc.root_invite_id,
         rc.root_conversion_id
       FROM referral_chain rc
       JOIN referral_program rp ON rp.id = rc.program_id
       WHERE rc.descendant_user_id = ?
       ORDER BY rc.depth ASC`,
      [holderUserId],
    );

    if (!ancestorRows.length) {
      this.logger.log(`[H3] Holder user_id=${holderUserId} has no referral chains, skipping`);
      return;
    }

    // 4. Group by program, then sort programs by priority
    const programMap = new Map<number, { code: string; priority: number }>();
    for (const row of ancestorRows) {
      if (!programMap.has(row.program_id)) {
        programMap.set(row.program_id, {
          code: row.program_code,
          priority: programPriority(row.program_code),
        });
      }
    }

    // Sort programs by priority (lowest number = highest priority)
    const sortedPrograms = [...programMap.entries()].sort(
      (a, b) => a[1].priority - b[1].priority,
    );

    let inheritedCount = 0;
    const inheritedPrograms: string[] = [];

    // 5. For each program (in priority order), upsert chain entries for the new member
    for (const [programId, { code }] of sortedPrograms) {
      const programChains = ancestorRows.filter((r) => r.program_id === programId);

      for (const chain of programChains) {
        await this.chainRepo.upsert(
          {
            program_id: chain.program_id,
            ancestor_user_id: chain.ancestor_user_id,
            descendant_user_id: memberUserId,
            depth: chain.depth,
            root_invite_id: chain.root_invite_id,
            root_conversion_id: chain.root_conversion_id,
          },
          queryRunner,
        );
        inheritedCount++;
      }

      inheritedPrograms.push(code);
      this.logger.log(
        `[H3] Inherited ${programChains.length} chain entries for program=${code} (priority=${programPriority(code)})`,
      );
    }

    // 6. Emit AFFILIATE_CHAIN_INHERITED
    await this.outboxService.enqueue(
      {
        event_name: 'AFFILIATE_CHAIN_INHERITED',
        event_version: 1,
        aggregate_type: 'REFERRAL_CHAIN',
        aggregate_id: String(memberUserId),
        actor_user_id: String(holderUserId),
        occurred_at: new Date(),
        correlation_id: `h3-inherit-${memberUserId}-${Date.now()}`,
        causation_id: `policy-member-added-${event.policy_member_id}`,
        payload: {
          policy_id: Number(policy_id),
          policy_member_id: event.policy_member_id,
          beneficiary_user_id: memberUserId,
          holder_user_id: holderUserId,
          role,
          inherited_programs: inheritedPrograms,
          inherited_chain_count: inheritedCount,
        },
        dedupe_key: `h3-${event.policy_member_id}-${memberUserId}`,
      },
      queryRunner,
    );

    this.logger.log(
      `[H3] Affiliate chain inherited: holder=${holderUserId} → member=${memberUserId}, programs=[${inheritedPrograms.join(', ')}], entries=${inheritedCount}`,
    );
  }
}
