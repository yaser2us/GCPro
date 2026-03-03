import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdempotencyRecord } from '../entities/idempotency-record.entity';

/**
 * Request/Response for idempotency operations
 * Based on corekit.v1.yaml IdempotencyClaimRequest & IdempotencyReplayResponse
 */
export interface IdempotencyClaimRequest {
  scope: string; // Scope of the operation (e.g., "user_123:Mission.Create")
  idempotency_key: string; // Client-provided key
  fingerprint: string; // Hash of request parameters
  ttl_seconds?: number; // Optional TTL
}

export interface IdempotencyReplayResponse {
  is_replay: boolean; // True if this is a replayed request
  stored_http_status?: number; // Cached HTTP status
  stored_response_body?: any; // Cached response
}

export interface IdempotencyStoreRequest {
  scope: string;
  idempotency_key: string;
  http_status: number;
  response_body: any;
}

/**
 * Idempotency service to prevent duplicate operations
 * Based on corekit.v1.yaml IdempotencyService
 */
@Injectable()
export class IdempotencyService {
  constructor(
    @InjectRepository(IdempotencyRecord)
    private readonly repo: Repository<IdempotencyRecord>,
  ) {}

  /**
   * Claim an idempotency key or replay if already exists
   * Returns is_replay=true if operation was already completed
   */
  async claimOrReplay(
    request: IdempotencyClaimRequest,
  ): Promise<IdempotencyReplayResponse> {
    // Try to find existing record
    const existing = await this.repo.findOne({
      where: {
        scope: request.scope,
        idempotency_key: request.idempotency_key,
      },
    });

    if (existing && existing.status === 'completed') {
      // Already completed → replay cached response
      return {
        is_replay: true,
        stored_http_status: existing.http_status,
        stored_response_body: existing.response_body,
      };
    }

    if (existing && existing.status === 'in_progress') {
      // Another request is currently processing
      throw new Error('IDEMPOTENCY_CONFLICT: Another request is in progress');
    }

    // No existing record → claim it
    await this.repo.save({
      scope: request.scope,
      idempotency_key: request.idempotency_key,
      fingerprint: request.fingerprint,
      status: 'in_progress',
      claimed_at: new Date(),
    });

    return {
      is_replay: false,
    };
  }

  /**
   * Store the response after successful operation
   */
  async storeResponse(request: IdempotencyStoreRequest): Promise<void> {
    await this.repo.update(
      {
        scope: request.scope,
        idempotency_key: request.idempotency_key,
      },
      {
        status: 'completed',
        http_status: request.http_status,
        response_body: request.response_body,
        completed_at: new Date(),
      },
    );
  }
}
