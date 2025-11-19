"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionsConfigSchema = exports.PermissionSchema = exports.EntitiesConfigSchema = exports.UnitConfigSchema = exports.TenantConfigSchema = exports.DocumentProcessingConfigSchema = exports.VisionProviderSchema = exports.StorageConfigSchema = void 0;
const zod_1 = require("zod");
const entities_1 = require("./entities");
exports.StorageConfigSchema = zod_1.z.object({
    type: zod_1.z.enum(['minio', 's3']),
    config: zod_1.z.record(zod_1.z.unknown()),
});
exports.VisionProviderSchema = zod_1.z.object({
    name: zod_1.z.enum(['openai', 'claude']),
    model: zod_1.z.string().optional(),
    apiKey: zod_1.z.string().optional(),
    baseUrl: zod_1.z.string().optional(),
});
exports.DocumentProcessingConfigSchema = zod_1.z.object({
    maxFileSize: zod_1.z.number().optional(),
    allowedMimeTypes: zod_1.z.array(zod_1.z.string()).optional(),
    chunkingDefaults: zod_1.z
        .object({
        chunkSize: zod_1.z.number(),
        chunkOverlap: zod_1.z.number(),
    })
        .optional(),
});
exports.TenantConfigSchema = zod_1.z.object({
    tenant_id: zod_1.z.string(),
    name: zod_1.z.string(),
    settings: zod_1.z.record(zod_1.z.unknown()).optional(),
    embeddingsProvider: zod_1.z
        .object({
        name: zod_1.z.enum(['openai', 'jina', 'local']),
        apiKey: zod_1.z.string().optional(),
        model: zod_1.z.string().optional(),
        baseUrl: zod_1.z.string().optional(),
    })
        .optional(),
    storage: exports.StorageConfigSchema.optional(),
    visionProvider: exports.VisionProviderSchema.optional(),
    documentProcessing: exports.DocumentProcessingConfigSchema.optional(),
});
exports.UnitConfigSchema = zod_1.z.object({
    unit_id: zod_1.z.string(),
    name: zod_1.z.string(),
    tenant_id: zod_1.z.string(),
    settings: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.EntitiesConfigSchema = zod_1.z.object({
    tenant_id: zod_1.z.string(),
    entities: zod_1.z.array(entities_1.EntityDefinitionSchema),
});
exports.PermissionSchema = zod_1.z.object({
    role: zod_1.z.string(),
    scopes: zod_1.z.array(zod_1.z.string()),
});
exports.PermissionsConfigSchema = zod_1.z.object({
    tenant_id: zod_1.z.string(),
    roles: zod_1.z.array(exports.PermissionSchema),
});
//# sourceMappingURL=config.js.map