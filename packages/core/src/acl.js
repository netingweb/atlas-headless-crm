"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AclService = void 0;
class AclService {
    canRead(ctx, user, entity, permissions) {
        return this.hasScope(user, 'crm:read', permissions) && this.isVisible(ctx, user, entity);
    }
    canWrite(ctx, user, entity, permissions) {
        return this.hasScope(user, 'crm:write', permissions) && this.isVisible(ctx, user, entity);
    }
    canDelete(ctx, user, entity, permissions) {
        return this.hasScope(user, 'crm:delete', permissions) && this.isVisible(ctx, user, entity);
    }
    hasScope(user, requiredScope, permissions) {
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
    isVisible(ctx, user, _entity) {
        if (user.tenant_id !== ctx.tenant_id) {
            return false;
        }
        if (user.unit_id === ctx.unit_id) {
            return true;
        }
        return false;
    }
}
exports.AclService = AclService;
//# sourceMappingURL=acl.js.map