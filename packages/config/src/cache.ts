import type { TenantContext } from '@crm-atlas/core';
import type {
  TenantConfig,
  UnitConfig,
  EntitiesConfig,
  PermissionsConfig,
  EntityDefinition,
} from '@crm-atlas/types';

export class ConfigCache {
  private tenantCache = new Map<string, TenantConfig>();
  private unitsCache = new Map<string, Map<string, UnitConfig>>();
  private entitiesCache = new Map<string, EntitiesConfig>();
  private permissionsCache = new Map<string, PermissionsConfig>();

  getTenant(tenantId: string): TenantConfig | undefined {
    return this.tenantCache.get(tenantId);
  }

  setTenant(tenantId: string, config: TenantConfig): void {
    this.tenantCache.set(tenantId, config);
  }

  getUnit(tenantId: string, unitId: string): UnitConfig | undefined {
    return this.unitsCache.get(tenantId)?.get(unitId);
  }

  getUnits(tenantId: string): UnitConfig[] | undefined {
    const unitMap = this.unitsCache.get(tenantId);
    return unitMap ? Array.from(unitMap.values()) : undefined;
  }

  setUnits(tenantId: string, units: UnitConfig[]): void {
    const unitMap = new Map<string, UnitConfig>();
    for (const unit of units) {
      unitMap.set(unit.unit_id, unit);
    }
    this.unitsCache.set(tenantId, unitMap);
  }

  getEntity(ctx: TenantContext, entityName: string): EntityDefinition | undefined {
    const config = this.entitiesCache.get(ctx.tenant_id);
    return config?.entities.find((e) => e.name === entityName);
  }

  setEntities(tenantId: string, config: EntitiesConfig): void {
    this.entitiesCache.set(tenantId, config);
  }

  getPermissions(tenantId: string): PermissionsConfig | undefined {
    return this.permissionsCache.get(tenantId);
  }

  setPermissions(tenantId: string, config: PermissionsConfig): void {
    this.permissionsCache.set(tenantId, config);
  }

  clear(tenantId?: string): void {
    if (tenantId) {
      this.tenantCache.delete(tenantId);
      this.unitsCache.delete(tenantId);
      this.entitiesCache.delete(tenantId);
      this.permissionsCache.delete(tenantId);
    } else {
      this.tenantCache.clear();
      this.unitsCache.clear();
      this.entitiesCache.clear();
      this.permissionsCache.clear();
    }
  }
}
