import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { PaymentIntent } from '../entities/payment-intent.entity';

/**
 * PaymentIntentRepository
 * Repository for payment_intent table
 */
@Injectable()
export class PaymentIntentRepository {
  constructor(
    @InjectRepository(PaymentIntent)
    private readonly repository: Repository<PaymentIntent>,
  ) {}

  async create(data: Partial<PaymentIntent>, queryRunner?: QueryRunner): Promise<number> {
    const repo = queryRunner ? queryRunner.manager.getRepository(PaymentIntent) : this.repository;
    const result = await repo.insert(data);
    return Number(result.identifiers[0].id);
  }

  async findById(id: number, queryRunner?: QueryRunner): Promise<PaymentIntent | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(PaymentIntent) : this.repository;
    return repo.findOne({ where: { id } });
  }

  async findByIntentKey(intentKey: string, queryRunner?: QueryRunner): Promise<PaymentIntent | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(PaymentIntent) : this.repository;
    return repo.findOne({ where: { intent_key: intentKey } });
  }

  async findByAccountId(accountId: number, queryRunner?: QueryRunner): Promise<PaymentIntent[]> {
    const repo = queryRunner ? queryRunner.manager.getRepository(PaymentIntent) : this.repository;
    return repo.find({
      where: { account_id: accountId },
      order: { created_at: 'DESC' },
      take: 100,
    });
  }

  async update(id: number, data: Partial<PaymentIntent>, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(PaymentIntent) : this.repository;
    await repo.update(id, data);
  }
}
