import type { TenantContext } from '@crm-atlas/core';
import type {
  TenantConfig,
  UnitConfig,
  EntitiesConfig,
  PermissionsConfig,
  EntityDefinition,
  DocumentsConfig,
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
  getDocumentsConfig(tenantId: string): Promise<DocumentsConfig | null>;
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
    if (cached) {
      // Apply environment variable overrides even for cached configs
      return this.applyEnvOverrides(cached);
    }

    const doc = await this.db.collection('tenant_config').findOne({ tenant_id: tenantId });
    if (!doc) return null;

    const config = doc as TenantConfig;
    const configWithOverrides = this.applyEnvOverrides(config);
    this.cache.setTenant(tenantId, configWithOverrides);
    return configWithOverrides;
  }

  /**
   * Apply environment variable overrides to tenant config
   * This ensures API keys from environment variables take precedence over stored config
   */
  private applyEnvOverrides(config: TenantConfig): TenantConfig {
    const overridden = { ...config };

    // Override OpenAI API keys from environment variables if present
    if (process.env.OPENAI_API_KEY) {
      // Override playground AI settings if present
      if (overridden.settings) {
        const settings = overridden.settings as Record<string, unknown>;
        if (settings.playground && typeof settings.playground === 'object') {
          const playground = settings.playground as Record<string, unknown>;
          if (playground.ai && typeof playground.ai === 'object') {
            const ai = playground.ai as Record<string, unknown>;
            overridden.settings = {
              ...settings,
              playground: {
                ...playground,
                ai: {
                  ...ai,
                  apiKey: process.env.OPENAI_API_KEY,
                },
              },
            };
          }
        }
      }

      // Override embeddings provider
      if (overridden.embeddingsProvider) {
        overridden.embeddingsProvider = {
          ...overridden.embeddingsProvider,
          apiKey: process.env.OPENAI_API_KEY,
        };
      }

      // Override vision provider
      if (overridden.visionProvider) {
        overridden.visionProvider = {
          ...overridden.visionProvider,
          apiKey: process.env.OPENAI_API_KEY,
        };
      }
    }

    return overridden;
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
    if (cached) {
      console.log('[ConfigLoader] Returning cached entity:', {
        entityName,
        tenant_id: ctx.tenant_id,
        scope: cached.scope,
        hasScope: 'scope' in cached,
      });
      return cached;
    }

    const configDoc = await this.db.collection('entities_config').findOne({
      tenant_id: ctx.tenant_id,
    });
    if (!configDoc) {
      console.warn('[ConfigLoader] No config found for tenant:', ctx.tenant_id);
      return null;
    }

    const config = configDoc as EntitiesConfig;
    this.cache.setEntities(ctx.tenant_id, config);
    const entity = config.entities.find((e) => e.name === entityName) || null;

    if (entity) {
      console.log('[ConfigLoader] Loaded entity from DB:', {
        entityName,
        tenant_id: ctx.tenant_id,
        scope: entity.scope,
        hasScope: 'scope' in entity,
      });
    } else {
      console.warn('[ConfigLoader] Entity not found in config:', {
        entityName,
        tenant_id: ctx.tenant_id,
        availableEntities: config.entities.map((e) => e.name),
      });
    }

    return entity;
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

  async getDocumentsConfig(tenantId: string): Promise<DocumentsConfig | null> {
    const cached = this.cache.getDocumentsConfig(tenantId);
    if (cached) return cached;

    const doc = await this.db.collection('documents_config').findOne({ tenant_id: tenantId });
    if (!doc) return null;

    const config = doc as DocumentsConfig;
    this.cache.setDocumentsConfig(tenantId, config);
    return config;
  }

  /**
   * Clear entities cache for a specific tenant or all tenants
   * Useful after syncing entity configurations to ensure fresh schemas are loaded
   */
  clearEntitiesCache(tenantId?: string): void {
    this.cache.clearEntities(tenantId);
  }

  /**
   * Clear all configuration cache for a specific tenant or all tenants
   */
  clearCache(tenantId?: string): void {
    this.cache.clear(tenantId);
  }
}
