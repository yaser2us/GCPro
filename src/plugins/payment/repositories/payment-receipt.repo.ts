import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { PaymentReceipt } from '../entities/payment-receipt.entity';

/**
 * PaymentReceiptRepository
 * Repository for payment_receipt table
 */
@Injectable()
export class PaymentReceiptRepository {
  constructor(
    @InjectRepository(PaymentReceipt)
    private readonly repository: Repository<PaymentReceipt>,
  ) {}

  async create(data: Partial<PaymentReceipt>, queryRunner?: QueryRunner): Promise<number> {
    const repo = queryRunner ? queryRunner.manager.getRepository(PaymentReceipt) : this.repository;
    const result = await repo.insert(data);
    return Number(result.identifiers[0].id);
  }

  async findById(id: number, queryRunner?: QueryRunner): Promise<PaymentReceipt | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(PaymentReceipt) : this.repository;
    return repo.findOne({ where: { id } });
  }

  async findByReceiptNo(receiptNo: string, queryRunner?: QueryRunner): Promise<PaymentReceipt | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(PaymentReceipt) : this.repository;
    return repo.findOne({ where: { receipt_no: receiptNo } });
  }

  async update(id: number, data: Partial<PaymentReceipt>, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(PaymentReceipt) : this.repository;
    await repo.update(id, data);
  }
}
