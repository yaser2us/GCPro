import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * PaymentReceipt Entity
 * Represents payment receipts issued to customers
 * Based on specs/payment/payment.pillar.v2.yml
 */
@Entity('payment_receipt')
@Index('uk_receipt_no', ['receipt_no'], { unique: true })
@Index('idx_receipt_account_time', ['account_id', 'issued_at'])
@Index('idx_receipt_person_time', ['person_id', 'issued_at'])
@Index('idx_receipt_status_time', ['status', 'issued_at'])
@Index('idx_receipt_ref', ['ref_type', 'ref_id'])
@Index('idx_receipt_payment_intent', ['payment_intent_id'])
@Index('idx_receipt_ledger_txn', ['ledger_txn_id'])
export class PaymentReceipt {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 64, name: 'receipt_no' })
  receipt_no: string;

  @Column({ type: 'bigint', unsigned: true, name: 'account_id' })
  account_id: number;

  @Column({ type: 'bigint', unsigned: true, nullable: true, name: 'person_id' })
  person_id: number | null;

  @Column({ type: 'bigint', unsigned: true, nullable: true, name: 'payment_intent_id' })
  payment_intent_id: number | null;

  @Column({ type: 'bigint', unsigned: true, nullable: true, name: 'ledger_txn_id' })
  ledger_txn_id: number | null;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 8, default: 'MYR' })
  currency: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 16, default: 'issued' })
  status: string;

  @Column({ type: 'datetime', name: 'issued_at' })
  issued_at: Date;

  @Column({ type: 'datetime', nullable: true, name: 'voided_at' })
  voided_at: Date | null;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'ref_type' })
  ref_type: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'ref_id' })
  ref_id: string | null;

  @Column({ type: 'json', nullable: true, name: 'meta_json' })
  meta_json: any;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  created_at: Date;
}
