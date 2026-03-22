import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { PaymentEvent } from '../entities/payment-event.entity';

/**
 * PaymentEventRepository
 * Repository for payment_event table
 */
@Injectable()
export class PaymentEventRepository {
  constructor(
    @InjectRepository(PaymentEvent)
    private readonly repository: Repository<PaymentEvent>,
  ) {}

  async create(data: Partial<PaymentEvent>, queryRunner?: QueryRunner): Promise<number> {
    const repo = queryRunner ? queryRunner.manager.getRepository(PaymentEvent) : this.repository;
    const result = await repo.insert(data);
    return Number(result.identifiers[0].id);
  }

  async findByIntentId(intentId: number, queryRunner?: QueryRunner): Promise<PaymentEvent[]> {
    const repo = queryRunner ? queryRunner.manager.getRepository(PaymentEvent) : this.repository;
    return repo.find({
      where: { intent_id: intentId },
      order: { occurred_at: 'ASC' },
    });
  }
}
