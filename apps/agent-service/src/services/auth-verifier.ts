import jwt from 'jsonwebtoken';
import { JwtPayloadSchema } from '@crm-atlas/types';
import type { Logger } from '../logger.js';
import type { AgentSession } from '../types/session.js';

export interface AuthContext {
  userId: string;
  tenantId: string;
  unitId: string;
  roles: string[];
  scopes: string[];
}

interface VerifyInput {
  authorizationHeader?: string;
  tokenParam?: string;
}

export class AuthVerifier {
  constructor(private readonly secret: string | undefined, private readonly logger: Logger) {}

  isEnabled(): boolean {
    return !!this.secret;
  }

  verify(input: VerifyInput): AuthContext | null {
    if (!this.secret) {
      return null;
    }

    const token = this.extractToken(input);
    if (!token) {
      return null;
    }

    try {
      const decoded = jwt.verify(token, this.secret);
      const payload = JwtPayloadSchema.parse(decoded);
      return {
        userId: payload.sub,
        tenantId: payload.tenant_id,
        unitId: payload.unit_id,
        roles: payload.roles,
        scopes: payload.scopes,
      };
    } catch (error) {
      this.logger.warn(
        { err: error instanceof Error ? error.message : String(error) },
        '[AuthVerifier] Invalid authentication token'
      );
      return null;
    }
  }

  isTenantAuthorized(
    ctx: AuthContext | null,
    tenantId: string,
    unitId: string | null | undefined
  ): boolean {
    if (!this.isEnabled()) {
      return true;
    }
    if (!ctx) {
      return false;
    }
    const sameTenant = ctx.tenantId === tenantId;
    const sameUnit = unitId ? ctx.unitId === unitId : true;
    return sameTenant && sameUnit;
  }

  isSessionAuthorized(ctx: AuthContext | null, session: AgentSession): boolean {
    return this.isTenantAuthorized(ctx, session.tenantId, session.unitId);
  }

  private extractToken(input: VerifyInput): string | null {
    const headerToken = input.authorizationHeader?.startsWith('Bearer ')
      ? input.authorizationHeader.slice(7)
      : undefined;
    return headerToken || input.tokenParam || null;
  }
}

