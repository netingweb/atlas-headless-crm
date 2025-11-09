import type { TenantContext } from '@crm-atlas/core';
import type {
  TenantConfig,
  UnitConfig,
  EntitiesConfig,
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

export class MongoConfigLoader implements ConfigLoader {
  constructor(
    private readonly db: {
      collection(name: string): {
        findOne(filter: Record<string, unknown>): Promise<unknown | null>;
      };
    },
    private readonly cache: ConfigCache = new ConfigCache()
  ) {}

  async getTenant(tenantId: string): Promise<TenantConfig | null> {
    const cached = this.cache.getTenant(tenantId);
    if (cached) return cached;

    const doc = await this.db.collection('tenant_config').findOne({ tenant_id: tenantId });
    if (!doc) return null;

    const config = doc as TenantConfig;
    this.cache.setTenant(tenantId, config);
    return config;
  }

  async getUnit(tenantId: string, unitId: string): Promise<UnitConfig | null> {
    const cached = this.cache.getUnit(tenantId, unitId);
    if (cached) return cached;

    const doc = await this.db.collection('units_config').findOne({
      tenant_id: tenantId,
      unit_id: unitId,
    });
    if (!doc) return null;

    const config = doc as UnitConfig;
    const existingUnits = this.cache.getUnits(tenantId) || [];
    this.cache.setUnits(tenantId, [...existingUnits, config]);
    return config;
  }

  async getEntity(ctx: TenantContext, entityName: string): Promise<EntityDefinition | null> {
    const cached = this.cache.getEntity(ctx, entityName);
    if (cached) return cached;

    const configDoc = await this.db.collection('entities_config').findOne({
      tenant_id: ctx.tenant_id,
    });
    if (!configDoc) return null;

    const config = configDoc as EntitiesConfig;
    this.cache.setEntities(ctx.tenant_id, config);
    return config.entities.find((e) => e.name === entityName) || null;
  }

  async getPermissions(tenantId: string): Promise<PermissionsConfig | null> {
    const cached = this.cache.getPermissions(tenantId);
    if (cached) return cached;

    const doc = await this.db.collection('permissions_config').findOne({ tenant_id: tenantId });
    if (!doc) return null;

    const config = doc as PermissionsConfig;
    this.cache.setPermissions(tenantId, config);
    return config;
  }
}
