"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigCache = void 0;
class ConfigCache {
    tenantCache = new Map();
    unitsCache = new Map();
    entitiesCache = new Map();
    permissionsCache = new Map();
    getTenant(tenantId) {
        return this.tenantCache.get(tenantId);
    }
    setTenant(tenantId, config) {
        this.tenantCache.set(tenantId, config);
    }
    getUnit(tenantId, unitId) {
        return this.unitsCache.get(tenantId)?.get(unitId);
    }
    getUnits(tenantId) {
        const unitMap = this.unitsCache.get(tenantId);
        return unitMap ? Array.from(unitMap.values()) : undefined;
    }
    setUnits(tenantId, units) {
        const unitMap = new Map();
        for (const unit of units) {
            unitMap.set(unit.unit_id, unit);
        }
        this.unitsCache.set(tenantId, unitMap);
    }
    getEntity(ctx, entityName) {
        const config = this.entitiesCache.get(ctx.tenant_id);
        return config?.entities.find((e) => e.name === entityName);
    }
    setEntities(tenantId, config) {
        this.entitiesCache.set(tenantId, config);
    }
    getPermissions(tenantId) {
        return this.permissionsCache.get(tenantId);
    }
    setPermissions(tenantId, config) {
        this.permissionsCache.set(tenantId, config);
    }
    clear(tenantId) {
        if (tenantId) {
            this.tenantCache.delete(tenantId);
            this.unitsCache.delete(tenantId);
            this.entitiesCache.delete(tenantId);
            this.permissionsCache.delete(tenantId);
        }
        else {
            this.tenantCache.clear();
            this.unitsCache.clear();
            this.entitiesCache.clear();
            this.permissionsCache.clear();
        }
    }
}
exports.ConfigCache = ConfigCache;
//# sourceMappingURL=cache.js.map