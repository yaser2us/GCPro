import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Actor } from '../types/actor.type';

/**
 * Simple Auth Guard - validates and extracts actor from request
 *
 * In production, this would:
 * - Verify JWT token
 * - Decode user_id and role from token
 * - Attach actor to request
 *
 * For now (demo/testing), we'll accept a simple header:
 * X-User-Id: <user_id>
 * X-User-Role: <role>
 */
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // Extract user from headers (simplified for demo)
    const userId = request.headers['x-user-id'];
    const userRole = request.headers['x-user-role'] || 'USER';

    if (!userId) {
      throw new UnauthorizedException('Missing X-User-Id header');
    }

    // Create actor object
    const actor: Actor = {
      actor_user_id: userId,
      actor_role: userRole,
      correlation_id: request.headers['x-correlation-id'] || uuidv4(),
      causation_id: request.headers['x-causation-id'] || uuidv4(),
    };

    // Attach to request for @CurrentActor() decorator
    request.actor = actor;

    return true;
  }
}
