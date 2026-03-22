import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { PaymentMethod } from '../entities/payment-method.entity';

/**
 * PaymentMethodRepository
 * Repository for payment_method table
 */
@Injectable()
export class PaymentMethodRepository {
  constructor(
    @InjectRepository(PaymentMethod)
    private readonly repository: Repository<PaymentMethod>,
  ) {}

  async create(data: Partial<PaymentMethod>, queryRunner?: QueryRunner): Promise<number> {
    const repo = queryRunner ? queryRunner.manager.getRepository(PaymentMethod) : this.repository;
    const result = await repo.insert(data);
    return Number(result.identifiers[0].id);
  }

  async findById(id: number, queryRunner?: QueryRunner): Promise<PaymentMethod | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(PaymentMethod) : this.repository;
    return repo.findOne({ where: { id } });
  }

  async findByAccountId(accountId: number, queryRunner?: QueryRunner): Promise<PaymentMethod[]> {
    const repo = queryRunner ? queryRunner.manager.getRepository(PaymentMethod) : this.repository;
    return repo.find({
      where: { account_id: accountId, status: 'active' },
      order: { created_at: 'DESC' },
    });
  }

  async update(id: number, data: Partial<PaymentMethod>, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(PaymentMethod) : this.repository;
    await repo.update(id, data);
  }
}
