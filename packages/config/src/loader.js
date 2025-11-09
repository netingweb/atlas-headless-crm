"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoConfigLoader = void 0;
const cache_1 = require("./cache");
class MongoConfigLoader {
    db;
    cache;
    constructor(db, cache = new cache_1.ConfigCache()) {
        this.db = db;
        this.cache = cache;
    }
    async getTenant(tenantId) {
        const cached = this.cache.getTenant(tenantId);
        if (cached)
            return cached;
        const doc = await this.db.collection('tenant_config').findOne({ tenant_id: tenantId });
        if (!doc)
            return null;
        const config = doc;
        this.cache.setTenant(tenantId, config);
        return config;
    }
    async getTenants() {
        const cursor = this.db.collection('tenant_config').find({});
        const docs = await cursor.toArray();
        return docs.map((doc) => doc);
    }
    async getUnit(tenantId, unitId) {
        const cached = this.cache.getUnit(tenantId, unitId);
        if (cached)
            return cached;
        const doc = await this.db.collection('units_config').findOne({
            tenant_id: tenantId,
            unit_id: unitId,
        });
        if (!doc)
            return null;
        const config = doc;
        const existingUnits = this.cache.getUnits(tenantId) || [];
        this.cache.setUnits(tenantId, [...existingUnits, config]);
        return config;
    }
    async getUnits(tenantId) {
        const cached = this.cache.getUnits(tenantId);
        if (cached)
            return cached;
        const cursor = this.db.collection('units_config').find({ tenant_id: tenantId });
        const docs = await cursor.toArray();
        const units = docs.map((doc) => doc);
        this.cache.setUnits(tenantId, units);
        return units;
    }
    async getEntity(ctx, entityName) {
        const cached = this.cache.getEntity(ctx, entityName);
        if (cached)
            return cached;
        const configDoc = await this.db.collection('entities_config').findOne({
            tenant_id: ctx.tenant_id,
        });
        if (!configDoc)
            return null;
        const config = configDoc;
        this.cache.setEntities(ctx.tenant_id, config);
        return config.entities.find((e) => e.name === entityName) || null;
    }
    async getEntities(ctx) {
        const cachedConfig = this.cache.entitiesCache.get(ctx.tenant_id);
        if (cachedConfig) {
            return cachedConfig.entities;
        }
        const configDoc = await this.db.collection('entities_config').findOne({
            tenant_id: ctx.tenant_id,
        });
        if (!configDoc)
            return [];
        const config = configDoc;
        this.cache.setEntities(ctx.tenant_id, config);
        return config.entities;
    }
    async getPermissions(tenantId) {
        const cached = this.cache.getPermissions(tenantId);
        if (cached)
            return cached;
        const doc = await this.db.collection('permissions_config').findOne({ tenant_id: tenantId });
        if (!doc)
            return null;
        const config = doc;
        this.cache.setPermissions(tenantId, config);
        return config;
    }
}
exports.MongoConfigLoader = MongoConfigLoader;
//# sourceMappingURL=loader.js.map