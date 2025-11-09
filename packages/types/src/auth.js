"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtPayloadSchema = exports.ApiKeySchema = exports.UserSchema = void 0;
const zod_1 = require("zod");
exports.UserSchema = zod_1.z.object({
    _id: zod_1.z.string().optional(),
    tenant_id: zod_1.z.string(),
    unit_id: zod_1.z.string(),
    email: zod_1.z.string().email(),
    passwordHash: zod_1.z.string(),
    roles: zod_1.z.array(zod_1.z.string()),
    scopes: zod_1.z.array(zod_1.z.string()),
    created_at: zod_1.z.date(),
    updated_at: zod_1.z.date(),
});
exports.ApiKeySchema = zod_1.z.object({
    _id: zod_1.z.string().optional(),
    tenant_id: zod_1.z.string(),
    unit_id: zod_1.z.string().optional(),
    app_id: zod_1.z.string().optional(),
    keyHash: zod_1.z.string(),
    keyPrefix: zod_1.z.string(),
    scopes: zod_1.z.array(zod_1.z.string()),
    expires_at: zod_1.z.date().optional(),
    created_at: zod_1.z.date(),
    updated_at: zod_1.z.date(),
});
exports.JwtPayloadSchema = zod_1.z.object({
    sub: zod_1.z.string(),
    tenant_id: zod_1.z.string(),
    unit_id: zod_1.z.string(),
    roles: zod_1.z.array(zod_1.z.string()),
    scopes: zod_1.z.array(zod_1.z.string()),
    iat: zod_1.z.number().optional(),
    exp: zod_1.z.number().optional(),
});
//# sourceMappingURL=auth.js.map