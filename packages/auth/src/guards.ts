import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { UnauthorizedError } from '@crm-atlas/core';
import { verifyJwt } from './jwt';
import type { JwtPayload } from '@crm-atlas/types';

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
