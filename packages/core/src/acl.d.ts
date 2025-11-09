import type { TenantContext } from './context';
import type { PermissionsConfig } from '@crm-atlas/types';
type Scope = string;
export interface User {
  id: string;
  tenant_id: string;
  unit_id: string;
  roles: string[];
  scopes: Scope[];
}
export declare class AclService {
  canRead(ctx: TenantContext, user: User, entity: string, permissions: PermissionsConfig): boolean;
  canWrite(ctx: TenantContext, user: User, entity: string, permissions: PermissionsConfig): boolean;
  canDelete(
    ctx: TenantContext,
    user: User,
    entity: string,
    permissions: PermissionsConfig
  ): boolean;
  hasScope(user: User, requiredScope: Scope, permissions: PermissionsConfig): boolean;
  private isVisible;
}
export {};
//# sourceMappingURL=acl.d.ts.map
