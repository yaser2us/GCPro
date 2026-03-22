import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { PaymentWebhookInbox } from '../entities/payment-webhook-inbox.entity';

/**
 * PaymentWebhookInboxRepository
 * Repository for payment_webhook_inbox table
 */
@Injectable()
export class PaymentWebhookInboxRepository {
  constructor(
    @InjectRepository(PaymentWebhookInbox)
    private readonly repository: Repository<PaymentWebhookInbox>,
  ) {}

  async create(data: Partial<PaymentWebhookInbox>, queryRunner?: QueryRunner): Promise<number> {
    const repo = queryRunner ? queryRunner.manager.getRepository(PaymentWebhookInbox) : this.repository;
    const result = await repo.insert(data);
    return Number(result.identifiers[0].id);
  }

  async findById(id: number, queryRunner?: QueryRunner): Promise<PaymentWebhookInbox | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(PaymentWebhookInbox) : this.repository;
    return repo.findOne({ where: { id } });
  }

  async findPendingWebhooks(queryRunner?: QueryRunner): Promise<PaymentWebhookInbox[]> {
    const repo = queryRunner ? queryRunner.manager.getRepository(PaymentWebhookInbox) : this.repository;
    return repo.find({
      where: { status: 'new' },
      order: { received_at: 'ASC' },
      take: 100,
    });
  }

  async update(id: number, data: Partial<PaymentWebhookInbox>, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(PaymentWebhookInbox) : this.repository;
    await repo.update(id, data);
  }
}
