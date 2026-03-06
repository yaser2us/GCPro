import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, QueryRunner } from 'typeorm';
import { TransactionService } from './transaction.service';

describe('TransactionService', () => {
  let service: TransactionService;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockQueryRunner: jest.Mocked<QueryRunner>;

  beforeEach(async () => {
    mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {} as any,
    } as any;

    mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
  });

  describe('run', () => {
    it('should create query runner', async () => {
      await service.run(async (qr) => {
        return 'success';
      });

      expect(mockDataSource.createQueryRunner).toHaveBeenCalled();
    });

    it('should connect query runner', async () => {
      await service.run(async (qr) => {
        return 'success';
      });

      expect(mockQueryRunner.connect).toHaveBeenCalled();
    });

    it('should start transaction', async () => {
      await service.run(async (qr) => {
        return 'success';
      });

      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
    });

    it('should commit transaction on success', async () => {
      const result = await service.run(async (qr) => {
        return 'success';
      });

      expect(result).toBe('success');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
    });

    it('should release query runner on success', async () => {
      await service.run(async (qr) => {
        return 'success';
      });

      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      const error = new Error('Test error');

      await expect(
        service.run(async (qr) => {
          throw error;
        })
      ).rejects.toThrow('Test error');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    });

    it('should release query runner on error', async () => {
      await expect(
        service.run(async (qr) => {
          throw new Error('Test error');
        })
      ).rejects.toThrow();

      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should pass query runner to function', async () => {
      let receivedQueryRunner: QueryRunner | null = null;

      await service.run(async (qr) => {
        receivedQueryRunner = qr;
        return 'success';
      });

      expect(receivedQueryRunner).toBe(mockQueryRunner);
    });

    it('should return function result', async () => {
      const result = await service.run(async (qr) => {
        return { id: 123, status: 'created' };
      });

      expect(result).toEqual({ id: 123, status: 'created' });
    });

    it('should handle async operations in function', async () => {
      const result = await service.run(async (qr) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async-success';
      });

      expect(result).toBe('async-success');
    });

    it('should propagate errors from function', async () => {
      const customError = new Error('Custom error message');

      await expect(
        service.run(async (qr) => {
          throw customError;
        })
      ).rejects.toThrow(customError);
    });

    it('should call operations in correct order on success', async () => {
      const callOrder: string[] = [];

      mockQueryRunner.connect.mockImplementation(async () => {
        callOrder.push('connect');
      });
      mockQueryRunner.startTransaction.mockImplementation(async () => {
        callOrder.push('startTransaction');
      });
      mockQueryRunner.commitTransaction.mockImplementation(async () => {
        callOrder.push('commitTransaction');
      });
      mockQueryRunner.release.mockImplementation(async () => {
        callOrder.push('release');
      });

      await service.run(async (qr) => {
        callOrder.push('execute');
        return 'success';
      });

      expect(callOrder).toEqual([
        'connect',
        'startTransaction',
        'execute',
        'commitTransaction',
        'release',
      ]);
    });

    it('should call operations in correct order on error', async () => {
      const callOrder: string[] = [];

      mockQueryRunner.connect.mockImplementation(async () => {
        callOrder.push('connect');
      });
      mockQueryRunner.startTransaction.mockImplementation(async () => {
        callOrder.push('startTransaction');
      });
      mockQueryRunner.rollbackTransaction.mockImplementation(async () => {
        callOrder.push('rollbackTransaction');
      });
      mockQueryRunner.release.mockImplementation(async () => {
        callOrder.push('release');
      });

      await expect(
        service.run(async (qr) => {
          callOrder.push('execute');
          throw new Error('Test error');
        })
      ).rejects.toThrow();

      expect(callOrder).toEqual([
        'connect',
        'startTransaction',
        'execute',
        'rollbackTransaction',
        'release',
      ]);
    });

    it('should ensure release is called even if rollback fails', async () => {
      mockQueryRunner.rollbackTransaction.mockRejectedValue(new Error('Rollback failed'));

      await expect(
        service.run(async (qr) => {
          throw new Error('Transaction error');
        })
      ).rejects.toThrow();

      // Release should still be called
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });
});
