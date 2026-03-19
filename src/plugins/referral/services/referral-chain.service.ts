import { Injectable, Logger } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { ReferralChainRepository } from '../repositories/referral-chain.repo';
import { ReferralConversionRepository } from '../repositories/referral-conversion.repo';
import { ReferralInviteRepository } from '../repositories/referral-invite.repo';

/**
 * ReferralChainService
 * Builds and manages multi-level referral chains
 *
 * Based on specs/referral/referral.pillar.yml lines 1220-1228
 *
 * Purpose: Track multi-generational referral relationships
 * Example:
 *   User A → User B → User C → User D
 *   When User D converts, create chains:
 *   - User C → User D (depth=1, direct parent)
 *   - User B → User D (depth=2, grandparent)
 *   - User A → User D (depth=3, great-grandparent)
 */
@Injectable()
export class ReferralChainService {
  private readonly logger = new Logger(ReferralChainService.name);

  constructor(
    private readonly chainRepo: ReferralChainRepository,
    private readonly conversionRepo: ReferralConversionRepository,
    private readonly inviteRepo: ReferralInviteRepository,
  ) {}

  /**
   * Build referral chain when a new conversion occurs
   *
   * This creates the ancestor-descendant relationships for multi-level tracking.
   *
   * Algorithm:
   * 1. Create direct relationship (referrer → referred, depth=1)
   * 2. Find all ancestors of the referrer
   * 3. Create indirect relationships (ancestor → referred, depth=ancestor.depth+1)
   *
   * Example:
   *   Existing chains: User A → User B (depth=1)
   *   New conversion: User B → User C
   *   Creates:
   *     - User B → User C (depth=1, direct)
   *     - User A → User C (depth=2, indirect via User B)
   */
  async buildChain(
    conversion_id: number,
    queryRunner: QueryRunner,
  ): Promise<void> {
    this.logger.log(`Building referral chain for conversion_id=${conversion_id}`);

    // 1. Get the conversion details
    const conversion = await this.conversionRepo.findById(conversion_id, queryRunner);
    if (!conversion) {
      throw new Error(`Conversion ${conversion_id} not found`);
    }

    // 2. Get the invite that led to this conversion
    const invite = await this.inviteRepo.findById(conversion.invite_id, queryRunner);
    if (!invite) {
      throw new Error(`Invite ${conversion.invite_id} not found`);
    }

    this.logger.log(
      `Building chain: referrer=${invite.referrer_user_id}, referred=${conversion.referred_user_id}`,
    );

    // 3. Create direct relationship (depth=1)
    await this.chainRepo.upsert(
      {
        program_id: conversion.program_id,
        ancestor_user_id: invite.referrer_user_id,
        descendant_user_id: conversion.referred_user_id,
        depth: 1,
        root_invite_id: conversion.invite_id,
        root_conversion_id: conversion.id,
      },
      queryRunner,
    );

    this.logger.log(
      `Created direct chain: ${invite.referrer_user_id} → ${conversion.referred_user_id} (depth=1)`,
    );

    // 4. Find all ancestors of the referrer (to create indirect chains)
    const ancestorChains = await this.chainRepo.findByDescendant(
      conversion.program_id,
      invite.referrer_user_id,
      queryRunner,
    );

    this.logger.log(
      `Found ${ancestorChains.length} ancestor chains for referrer=${invite.referrer_user_id}`,
    );

    // 5. Create indirect relationships (depth=2, 3, 4, etc.)
    for (const ancestorChain of ancestorChains) {
      const newDepth = ancestorChain.depth + 1;

      await this.chainRepo.upsert(
        {
          program_id: conversion.program_id,
          ancestor_user_id: ancestorChain.ancestor_user_id,
          descendant_user_id: conversion.referred_user_id,
          depth: newDepth,
          root_invite_id: ancestorChain.root_invite_id,
          root_conversion_id: conversion.id,
        },
        queryRunner,
      );

      this.logger.log(
        `Created indirect chain: ${ancestorChain.ancestor_user_id} → ${conversion.referred_user_id} (depth=${newDepth})`,
      );
    }

    this.logger.log(
      `Chain building complete for conversion_id=${conversion_id}: 1 direct + ${ancestorChains.length} indirect relationships`,
    );
  }

  /**
   * Get all users who should receive commission when a user makes a purchase
   *
   * Returns array of { user_id, depth } sorted by depth (closest first)
   *
   * @param program_id Commission program ID
   * @param user_id The user who made the purchase
   * @param max_depth Maximum depth to traverse (e.g., 3 = up to great-grandparents)
   * @param queryRunner Optional transaction query runner
   */
  async getCommissionEligibleAncestors(
    program_id: number,
    user_id: number,
    max_depth: number = 3,
    queryRunner?: QueryRunner,
  ): Promise<Array<{ user_id: number; depth: number }>> {
    const chains = await this.chainRepo.findAncestors(
      program_id,
      user_id,
      max_depth,
      queryRunner,
    );

    return chains.map((chain) => ({
      user_id: chain.ancestor_user_id,
      depth: chain.depth,
    }));
  }

  /**
   * Get the full referral tree for a user (their entire downline)
   *
   * @param program_id Referral program ID
   * @param user_id Root user to get downline for
   * @param max_depth Maximum depth to retrieve
   * @param queryRunner Optional transaction query runner
   */
  async getReferralTree(
    program_id: number,
    user_id: number,
    max_depth?: number,
    queryRunner?: QueryRunner,
  ): Promise<Array<{ user_id: number; depth: number }>> {
    const chains = await this.chainRepo.findDescendants(
      program_id,
      user_id,
      max_depth,
      queryRunner,
    );

    return chains.map((chain) => ({
      user_id: chain.descendant_user_id,
      depth: chain.depth,
    }));
  }

  /**
   * Get network statistics for a user
   *
   * @param program_id Referral program ID
   * @param user_id User to get stats for
   * @param queryRunner Optional transaction query runner
   */
  async getNetworkStats(
    program_id: number,
    user_id: number,
    queryRunner?: QueryRunner,
  ): Promise<{
    total_descendants: number;
    level_1_count: number;
    level_2_count: number;
    level_3_count: number;
  }> {
    const descendants = await this.chainRepo.findDescendants(
      program_id,
      user_id,
      3,
      queryRunner,
    );

    const level_1_count = descendants.filter((d) => d.depth === 1).length;
    const level_2_count = descendants.filter((d) => d.depth === 2).length;
    const level_3_count = descendants.filter((d) => d.depth === 3).length;

    return {
      total_descendants: descendants.length,
      level_1_count,
      level_2_count,
      level_3_count,
    };
  }

  /**
   * Void a referral chain (when conversion is voided)
   *
   * @param conversion_id Conversion ID to void chains for
   * @param queryRunner Transaction query runner
   */
  async voidChain(
    conversion_id: number,
    queryRunner: QueryRunner,
  ): Promise<void> {
    this.logger.log(`Voiding referral chain for conversion_id=${conversion_id}`);

    await this.chainRepo.deleteByConversion(conversion_id, queryRunner);

    this.logger.log(`Referral chain voided for conversion_id=${conversion_id}`);
  }
}
