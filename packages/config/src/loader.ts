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
  getTenants(): Promise<TenantConfig[]>;
  getUnit(tenantId: string, unitId: string): Promise<UnitConfig | null>;
  getUnits(tenantId: string): Promise<UnitConfig[]>;
  getEntity(ctx: TenantContext, entityName: string): Promise<EntityDefinition | null>;
  getEntities(ctx: TenantContext): Promise<EntityDefinition[]>;
  getPermissions(tenantId: string): Promise<PermissionsConfig | null>;
}

export class MongoConfigLoader implements ConfigLoader {
  constructor(
    private readonly db: {
      collection(name: string): {
        findOne(filter: Record<string, unknown>): Promise<unknown | null>;
        find(filter?: Record<string, unknown>): {
          toArray(): Promise<unknown[]>;
        };
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

  async getTenants(): Promise<TenantConfig[]> {
    const cursor = (this.db.collection('tenant_config') as any).find({});
    const docs = await cursor.toArray();
    return docs.map((doc: unknown) => doc as TenantConfig);
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

  async getUnits(tenantId: string): Promise<UnitConfig[]> {
    const cached = this.cache.getUnits(tenantId);
    if (cached) return cached;

    const cursor = (this.db.collection('units_config') as any).find({ tenant_id: tenantId });
    const docs = await cursor.toArray();
    const units = docs.map((doc: unknown) => doc as UnitConfig);
    this.cache.setUnits(tenantId, units);
    return units;
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

  async getEntities(ctx: TenantContext): Promise<EntityDefinition[]> {
    const cachedConfig = (this.cache as any).entitiesCache.get(ctx.tenant_id);
    if (cachedConfig) {
      return (cachedConfig as EntitiesConfig).entities;
    }

    const configDoc = await this.db.collection('entities_config').findOne({
      tenant_id: ctx.tenant_id,
    });
    if (!configDoc) return [];

    const config = configDoc as EntitiesConfig;
    this.cache.setEntities(ctx.tenant_id, config);
    return config.entities;
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
