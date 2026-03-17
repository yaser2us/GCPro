import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * ReferralChain Entity
 * Maps to: referral_chain table
 * Source: specs/referral/referral.pillar.yml lines 665-744
 *
 * Purpose: Multi-level referral chain tracking for ancestor-descendant relationships
 */
@Entity('referral_chain')
@Index('uk_chain_unique', ['program_id', 'ancestor_user_id', 'descendant_user_id'], { unique: true })
@Index('idx_chain_ancestor', ['program_id', 'ancestor_user_id', 'depth'])
@Index('idx_chain_descendant', ['program_id', 'descendant_user_id'])
@Index('idx_chain_root_conversion', ['root_conversion_id'])
@Index('idx_chain_root_invite', ['root_invite_id'])
export class ReferralChain {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  program_id: number;

  @Column({ type: 'bigint', unsigned: true })
  ancestor_user_id: number;

  @Column({ type: 'bigint', unsigned: true })
  descendant_user_id: number;

  @Column({ type: 'int', unsigned: true })
  depth: number;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  root_invite_id: number | null;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  root_conversion_id: number | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
