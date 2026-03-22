import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * WalletRule Entity
 * Maps to: wallet_rule table
 * Source: specs/wallet-advanced/wallet-advanced.pillar.v2.yml
 *
 * Purpose: An individual rule within a wallet rule set.
 */
@Entity('wallet_rule')
@Index('uk_wr_ruleset_code', ['rule_set_id', 'rule_code'], { unique: true })
@Index('idx_wr_code', ['rule_code'])
@Index('idx_wr_status', ['status'])
export class WalletRule {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  rule_set_id: number;

  @Column({ type: 'varchar', length: 64 })
  rule_code: string;

  @Column({ type: 'varchar', length: 16, default: 'eq' })
  operator: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  value_str: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 6, nullable: true })
  value_num: string | null;

  @Column({ type: 'json', nullable: true })
  value_json: object | null;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: string;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
