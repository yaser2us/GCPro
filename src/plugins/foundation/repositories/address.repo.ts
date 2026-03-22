import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { Address } from '../entities/address.entity';

@Injectable()
export class AddressRepository {
  constructor(
    @InjectRepository(Address)
    private readonly repository: Repository<Address>,
  ) {}

  async create(data: Partial<Address>, queryRunner?: QueryRunner): Promise<number> {
    const repo = queryRunner ? queryRunner.manager.getRepository(Address) : this.repository;
    const result = await repo.insert(data);
    return Number(result.identifiers[0].id);
  }

  async findById(id: number, queryRunner?: QueryRunner): Promise<Address | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(Address) : this.repository;
    return repo.findOne({ where: { id } });
  }

  async update(id: number, data: Partial<Address>, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(Address) : this.repository;
    await repo.update(id, data);
  }

  async findByOwner(ownerType: string, ownerId: number, queryRunner?: QueryRunner): Promise<Address[]> {
    const repo = queryRunner ? queryRunner.manager.getRepository(Address) : this.repository;
    return repo.find({ where: { owner_type: ownerType, owner_id: ownerId } });
  }

  async clearDefault(ownerType: string, ownerId: number, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(Address) : this.repository;
    await repo.update({ owner_type: ownerType, owner_id: ownerId, is_default: 1 }, { is_default: 0 });
  }
}
