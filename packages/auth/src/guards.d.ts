import { CanActivate, ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from '@crm-atlas/types';
export interface AuthenticatedRequest {
  user?: JwtPayload;
  headers: {
    authorization?: string;
    [key: string]: string | string[] | undefined;
  };
  [key: string]: unknown;
}
export declare class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean;
}
export declare class ApiKeyAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): Promise<boolean>;
}
//# sourceMappingURL=guards.d.ts.map
