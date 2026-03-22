import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * PaymentMethod Entity
 * Represents saved payment methods (credit cards, bank accounts, eWallets)
 * Based on specs/payment/payment.pillar.v2.yml
 */
@Entity('payment_method')
@Index('uk_pm_provider_method', ['provider', 'provider_method_ref'], { unique: true })
@Index('idx_pm_account_status', ['account_id', 'status'])
@Index('idx_pm_person', ['person_id'])
@Index('idx_pm_provider', ['provider', 'method_type', 'status'])
export class PaymentMethod {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true, name: 'account_id' })
  account_id: number;

  @Column({ type: 'bigint', unsigned: true, nullable: true, name: 'person_id' })
  person_id: number | null;

  @Column({ type: 'varchar', length: 32 })
  provider: string;

  @Column({ type: 'varchar', length: 32, name: 'method_type' })
  method_type: string;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: string;

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'provider_customer_ref' })
  provider_customer_ref: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'provider_method_ref' })
  provider_method_ref: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  brand: string | null;

  @Column({ type: 'varchar', length: 8, nullable: true })
  last4: string | null;

  @Column({ type: 'varchar', length: 2, nullable: true, name: 'exp_mm' })
  exp_mm: string | null;

  @Column({ type: 'varchar', length: 4, nullable: true, name: 'exp_yyyy' })
  exp_yyyy: string | null;

  @Column({ type: 'json', nullable: true, name: 'consent_json' })
  consent_json: any;

  @Column({ type: 'json', nullable: true, name: 'meta_json' })
  meta_json: any;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  created_at: Date;

  @Column({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
    name: 'updated_at',
  })
  updated_at: Date;
}
