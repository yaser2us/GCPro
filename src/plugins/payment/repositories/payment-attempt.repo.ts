import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { PaymentAttempt } from '../entities/payment-attempt.entity';

/**
 * PaymentAttemptRepository
 * Repository for payment_attempt table
 */
@Injectable()
export class PaymentAttemptRepository {
  constructor(
    @InjectRepository(PaymentAttempt)
    private readonly repository: Repository<PaymentAttempt>,
  ) {}

  async create(data: Partial<PaymentAttempt>, queryRunner?: QueryRunner): Promise<number> {
    const repo = queryRunner ? queryRunner.manager.getRepository(PaymentAttempt) : this.repository;
    const result = await repo.insert(data);
    return Number(result.identifiers[0].id);
  }

  async findById(id: number, queryRunner?: QueryRunner): Promise<PaymentAttempt | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(PaymentAttempt) : this.repository;
    return repo.findOne({ where: { id } });
  }

  async findByIntentId(intentId: number, queryRunner?: QueryRunner): Promise<PaymentAttempt[]> {
    const repo = queryRunner ? queryRunner.manager.getRepository(PaymentAttempt) : this.repository;
    return repo.find({
      where: { intent_id: intentId },
      order: { attempt_no: 'DESC' },
    });
  }

  async findLatestByIntentId(intentId: number, queryRunner?: QueryRunner): Promise<PaymentAttempt | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(PaymentAttempt) : this.repository;
    return repo.findOne({
      where: { intent_id: intentId },
      order: { attempt_no: 'DESC' },
    });
  }

  async update(id: number, data: Partial<PaymentAttempt>, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(PaymentAttempt) : this.repository;
    await repo.update(id, data);
  }
}
