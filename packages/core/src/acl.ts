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

export class AclService {
  canRead(ctx: TenantContext, user: User, entity: string, permissions: PermissionsConfig): boolean {
    return this.hasScope(user, 'crm:read', permissions) && this.isVisible(ctx, user, entity);
  }

  canWrite(
    ctx: TenantContext,
    user: User,
    entity: string,
    permissions: PermissionsConfig
  ): boolean {
    return this.hasScope(user, 'crm:write', permissions) && this.isVisible(ctx, user, entity);
  }

  canDelete(
    ctx: TenantContext,
    user: User,
    entity: string,
    permissions: PermissionsConfig
  ): boolean {
    return this.hasScope(user, 'crm:delete', permissions) && this.isVisible(ctx, user, entity);
  }

  hasScope(user: User, requiredScope: Scope, permissions: PermissionsConfig): boolean {
    if (user.scopes.includes(requiredScope)) {
      return true;
    }

    for (const role of user.roles) {
      const rolePerm = permissions.roles.find((r) => r.role === role);
      if (rolePerm && rolePerm.scopes.includes(requiredScope)) {
        return true;
      }
    }

    return false;
  }

  private isVisible(ctx: TenantContext, user: User, _entity: string): boolean {
    if (user.tenant_id !== ctx.tenant_id) {
      return false;
    }

    if (user.unit_id === ctx.unit_id) {
      return true;
    }

    return false;
  }
}
