import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

export interface JwtPayload {
  user_id: number;
  account_id: number | null;
  roles: string[];
  permissions: string[];
}

const JWT_SECRET = process.env.JWT_SECRET ?? 'gc-dev-secret-change-in-prod';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '24h';

/**
 * JwtService — sign and verify JWT tokens.
 * Secret and expiry are read from environment variables.
 *
 * JWT_SECRET       — signing secret (required in production)
 * JWT_EXPIRES_IN   — token TTL (default: 24h)
 */
@Injectable()
export class JwtService {
  sign(payload: JwtPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
  }

  verify(token: string): JwtPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch {
      return null;
    }
  }
}
