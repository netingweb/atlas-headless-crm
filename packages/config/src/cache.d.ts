import type { TenantContext } from '@crm-atlas/core';
import type {
  TenantConfig,
  UnitConfig,
  EntitiesConfig,
  PermissionsConfig,
  EntityDefinition,
} from '@crm-atlas/types';
export declare class ConfigCache {
  private tenantCache;
  private unitsCache;
  private entitiesCache;
  private permissionsCache;
  getTenant(tenantId: string): TenantConfig | undefined;
  setTenant(tenantId: string, config: TenantConfig): void;
  getUnit(tenantId: string, unitId: string): UnitConfig | undefined;
  getUnits(tenantId: string): UnitConfig[] | undefined;
  setUnits(tenantId: string, units: UnitConfig[]): void;
  getEntity(ctx: TenantContext, entityName: string): EntityDefinition | undefined;
  setEntities(tenantId: string, config: EntitiesConfig): void;
  getPermissions(tenantId: string): PermissionsConfig | undefined;
  setPermissions(tenantId: string, config: PermissionsConfig): void;
  clear(tenantId?: string): void;
}
//# sourceMappingURL=cache.d.ts.map
