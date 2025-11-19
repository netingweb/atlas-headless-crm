"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityDefinitionSchema = exports.DocumentConfigSchema = exports.FieldDefinitionSchema = exports.FieldTypeSchema = void 0;
const zod_1 = require("zod");
exports.FieldTypeSchema = zod_1.z.enum([
    'string',
    'number',
    'boolean',
    'date',
    'email',
    'url',
    'text',
    'json',
    'reference',
]);
exports.FieldDefinitionSchema = zod_1.z.object({
    name: zod_1.z.string(),
    type: exports.FieldTypeSchema,
    required: zod_1.z.boolean().default(false),
    indexed: zod_1.z.boolean().default(false),
    searchable: zod_1.z.boolean().default(false),
    embeddable: zod_1.z.boolean().default(false),
    reference_entity: zod_1.z.string().optional(),
    default: zod_1.z.unknown().optional(),
    validation: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.DocumentConfigSchema = zod_1.z.object({
    embedding_model: zod_1.z.enum(['openai', 'jina', 'local']).optional(),
    embedding_model_name: zod_1.z.string().optional(),
    chunk_size: zod_1.z.number().optional(),
    chunk_overlap: zod_1.z.number().optional(),
    vision_enabled: zod_1.z.boolean().optional(),
    vision_model: zod_1.z.string().optional(),
    ocr_enabled: zod_1.z.boolean().optional(),
});
exports.EntityDefinitionSchema = zod_1.z.object({
    name: zod_1.z.string(),
    fields: zod_1.z.array(exports.FieldDefinitionSchema),
    indexes: zod_1.z.array(zod_1.z.record(zod_1.z.unknown())).optional(),
    document_config: exports.DocumentConfigSchema.optional(),
});
//# sourceMappingURL=entities.js.map