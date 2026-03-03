import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Actor } from '../types/actor.type';

/**
 * Decorator to extract the current actor from the request
 *
 * Usage in controller:
 * async myMethod(@CurrentActor() actor: Actor) { ... }
 *
 * Expects actor to be attached to request.actor by AuthGuard
 */
export const CurrentActor = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Actor => {
    const request = ctx.switchToHttp().getRequest();
    return request.actor;
  },
);
