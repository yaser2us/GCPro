import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Actor } from '../types/actor.type';
import { JwtService } from '../services/jwt.service';

/**
 * AuthGuard — validates requests via JWT Bearer token or X-User-Id header (dev fallback).
 *
 * Priority:
 * 1. Authorization: Bearer <jwt>  — verifies signature, extracts user_id + roles
 * 2. X-User-Id header             — dev/testing fallback (accepted without token)
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // 1. Try JWT Bearer token
    const authHeader: string | undefined = request.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const payload = this.jwtService.verify(token);
      if (!payload) throw new UnauthorizedException('Invalid or expired token');

      const actor: Actor = {
        actor_user_id: String(payload.user_id),
        actor_role: payload.roles?.[0] ?? 'USER',
        correlation_id: request.headers['x-correlation-id'] || uuidv4(),
        causation_id: request.headers['x-causation-id'] || uuidv4(),
      };
      request.actor = actor;
      return true;
    }

    // 2. Fallback: X-User-Id header (dev / testing)
    const userId = request.headers['x-user-id'];
    if (!userId) throw new UnauthorizedException('Missing Authorization header');

    const actor: Actor = {
      actor_user_id: userId,
      actor_role: request.headers['x-user-role'] || 'USER',
      correlation_id: request.headers['x-correlation-id'] || uuidv4(),
      causation_id: request.headers['x-causation-id'] || uuidv4(),
    };
    request.actor = actor;
    return true;
  }
}
