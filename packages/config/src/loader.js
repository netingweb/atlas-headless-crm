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