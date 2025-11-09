import * as jwt from 'jsonwebtoken';
import type { JwtPayload } from '@crm-atlas/types';

const secret = process.env.JWT_SECRET || 'change-me-in-production';
const ttl = process.env.JWT_TTL || '24h';

export function signJwt(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload as any, secret, { expiresIn: ttl } as any);
}

export function verifyJwt(token: string): JwtPayload {
  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch (error) {
    throw new Error(`Invalid token: ${error instanceof Error ? error.message : 'unknown'}`);
  }
}

export function decodeJwt(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload | null;
  } catch {
    return null;
  }
}
