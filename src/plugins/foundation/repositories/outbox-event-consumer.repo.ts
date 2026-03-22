import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { OutboxEventConsumer } from '../entities/outbox-event-consumer.entity';

@Injectable()
export class OutboxEventConsumerRepository {
  constructor(
    @InjectRepository(OutboxEventConsumer)
    private readonly repository: Repository<OutboxEventConsumer>,
  ) {}

  async create(data: Partial<OutboxEventConsumer>, queryRunner?: QueryRunner): Promise<number> {
    const repo = queryRunner ? queryRunner.manager.getRepository(OutboxEventConsumer) : this.repository;
    const result = await repo.insert(data);
    return Number(result.identifiers[0].id);
  }

  async findById(id: number, queryRunner?: QueryRunner): Promise<OutboxEventConsumer | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(OutboxEventConsumer) : this.repository;
    return repo.findOne({ where: { id } });
  }

  async update(id: number, data: Partial<OutboxEventConsumer>, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(OutboxEventConsumer) : this.repository;
    await repo.update(id, data);
  }

  async findByConsumerAndEvent(consumerName: string, eventId: number, queryRunner?: QueryRunner): Promise<OutboxEventConsumer | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(OutboxEventConsumer) : this.repository;
    return repo.findOne({ where: { consumer_name: consumerName, event_id: eventId } });
  }

  async findPendingForConsumer(consumerName: string, limit: number, queryRunner?: QueryRunner): Promise<OutboxEventConsumer[]> {
    const repo = queryRunner ? queryRunner.manager.getRepository(OutboxEventConsumer) : this.repository;
    return repo
      .createQueryBuilder('oec')
      .where('oec.consumer_name = :consumerName', { consumerName })
      .andWhere('oec.status IN (:...statuses)', { statuses: ['pending', 'failed'] })
      .andWhere('oec.available_at <= NOW()')
      .orderBy('oec.available_at', 'ASC')
      .limit(limit)
      .getMany();
  }
}
