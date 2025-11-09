"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityDefinitionSchema = exports.FieldDefinitionSchema = exports.FieldTypeSchema = void 0;
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
exports.EntityDefinitionSchema = zod_1.z.object({
    name: zod_1.z.string(),
    fields: zod_1.z.array(exports.FieldDefinitionSchema),
    indexes: zod_1.z.array(zod_1.z.record(zod_1.z.unknown())).optional(),
});
//# sourceMappingURL=entities.js.map