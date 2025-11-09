import type { TenantContext } from '@crm-atlas/core';
import type {
  TenantConfig,
  UnitConfig,
  PermissionsConfig,
  EntityDefinition,
} from '@crm-atlas/types';
import { ConfigCache } from './cache';
export interface ConfigLoader {
  getTenant(tenantId: string): Promise<TenantConfig | null>;
  getUnit(tenantId: string, unitId: string): Promise<UnitConfig | null>;
  getEntity(ctx: TenantContext, entityName: string): Promise<EntityDefinition | null>;
  getPermissions(tenantId: string): Promise<PermissionsConfig | null>;
}
export declare class MongoConfigLoader implements ConfigLoader {
  private readonly db;
  private readonly cache;
  constructor(
    db: {
      collection(name: string): {
        findOne(filter: Record<string, unknown>): Promise<unknown | null>;
      };
    },
    cache?: ConfigCache
  );
  getTenant(tenantId: string): Promise<TenantConfig | null>;
  getUnit(tenantId: string, unitId: string): Promise<UnitConfig | null>;
  getEntity(ctx: TenantContext, entityName: string): Promise<EntityDefinition | null>;
  getPermissions(tenantId: string): Promise<PermissionsConfig | null>;
}
//# sourceMappingURL=loader.d.ts.map
