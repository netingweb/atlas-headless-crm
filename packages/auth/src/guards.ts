import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UnauthorizedError, AclService } from '@crm-atlas/core';
import { verifyJwt } from './jwt';
import { SCOPES_KEY } from './decorators';
import type { JwtPayload, Scope } from '@crm-atlas/types';
import { MongoConfigLoader } from '@crm-atlas/config';
import { getDb } from '@crm-atlas/db';

export interface AuthenticatedRequest {
  user?: JwtPayload;
  headers: {
    authorization?: string;
    [key: string]: string | string[] | undefined;
  };
  [key: string]: unknown;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    try {
      const payload = verifyJwt(token);
      request.user = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedError(
        `Invalid token: ${error instanceof Error ? error.message : 'unknown'}`
      );
    }
  }
}

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const apiKey = request.headers['x-api-key'] as string | undefined;

    if (!apiKey) {
      throw new UnauthorizedError('Missing API key');
    }

    // TODO: Verify API key against database
    // For now, just check format
    if (!apiKey.startsWith('crm_')) {
      throw new UnauthorizedError('Invalid API key format');
    }

    return true;
  }
}

@Injectable()
export class ScopesGuard implements CanActivate {
  private readonly aclService = new AclService();
  private readonly configLoader = new MongoConfigLoader(getDb());

  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedError('User not authenticated');
    }

    // Get required scopes from metadata
    const requiredScopes = this.reflector.get<Scope[]>(SCOPES_KEY, context.getHandler());

    // If no scopes required, allow access
    if (!requiredScopes || requiredScopes.length === 0) {
      return true;
    }

    // Get permissions config for tenant
    const permissions = await this.configLoader.getPermissions(user.tenant_id);
    if (!permissions) {
      throw new UnauthorizedError('Permissions configuration not found for tenant');
    }

    // Build user object for ACL service
    const userForAcl = {
      id: user.sub,
      tenant_id: user.tenant_id,
      unit_id: user.unit_id,
      roles: user.roles,
      scopes: user.scopes,
    };

    // Check if user has at least one of the required scopes
    for (const scope of requiredScopes) {
      if (this.aclService.hasScope(userForAcl, scope, permissions)) {
        return true;
      }
    }

    throw new UnauthorizedError(
      `Insufficient permissions. Required scopes: ${requiredScopes.join(', ')}`
    );
  }
}
