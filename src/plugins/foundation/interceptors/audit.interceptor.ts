import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogRepository } from '../repositories/audit-log.repo';
import { Actor } from '../../../corekit/types/actor.type';

/**
 * AuditInterceptor — M8 Audit Trail
 *
 * Intercepts all state-changing HTTP requests (POST, PUT, PATCH, DELETE) and
 * writes an append-only record to `audit_log`. Write is fire-and-forget so an
 * audit failure never blocks the actual request.
 *
 * Registered as APP_INTERCEPTOR in FoundationModule (global scope).
 * Based on specs/foundation/foundation.pillar.v2.yml — AuditLog table.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      return next.handle();
    }

    const occurredAt = new Date();

    return next.handle().pipe(
      tap({
        next: () => this.writeLog(request, 'success', occurredAt),
        error: () => this.writeLog(request, 'failure', occurredAt),
      }),
    );
  }

  private writeLog(request: any, result: 'success' | 'failure', occurredAt: Date): void {
    const actor = request.actor as Actor | undefined;
    const urlPath: string = request.path ?? request.url?.split('?')[0] ?? '/';

    // Derive resource_type from the segment immediately after version prefix (v1, v2, …)
    const segments = urlPath.split('/').filter(Boolean);
    const vIdx = segments.findIndex((s) => /^v\d+$/.test(s));
    const resourceType =
      vIdx >= 0 && segments[vIdx + 1] ? segments[vIdx + 1] : segments[0] ?? 'unknown';

    // resource_id = first purely numeric segment in the path
    const resourceId = segments.find((s) => /^\d+$/.test(s)) ?? null;

    this.auditLogRepository
      .create({
        actor_type: actor ? 'user' : 'anonymous',
        actor_id: actor?.actor_user_id ?? null,
        action: `${request.method} ${urlPath}`,
        resource_type: resourceType,
        resource_id: resourceId,
        request_id:
          (request.headers['idempotency-key'] as string | undefined) ??
          actor?.correlation_id ??
          null,
        ip: request.ip ?? null,
        user_agent: (request.headers['user-agent'] as string | undefined) ?? null,
        result,
        occurred_at: occurredAt,
      })
      .catch(() => {
        // Fire-and-forget: audit failures must never surface to the caller
      });
  }
}
