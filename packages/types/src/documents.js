"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentProcessingStatusSchema = exports.DocumentsConfigSchema = exports.DocumentTypeConfigSchema = void 0;
const zod_1 = require("zod");
exports.DocumentTypeConfigSchema = zod_1.z.object({
    name: zod_1.z.string(),
    display_name: zod_1.z.string(),
    allowed_mime_types: zod_1.z.array(zod_1.z.string()),
    max_upload_size: zod_1.z.number().optional(),
    embedding_config: zod_1.z
        .object({
        model: zod_1.z.enum(['openai', 'jina', 'local']),
        model_name: zod_1.z.string().optional(),
        chunk_size: zod_1.z.number().optional(),
        chunk_overlap: zod_1.z.number().optional(),
    })
        .optional(),
    vision_enabled: zod_1.z.boolean().optional(),
    vision_model: zod_1.z.string().optional(),
    ocr_enabled: zod_1.z.boolean().optional(),
});
exports.DocumentsConfigSchema = zod_1.z.object({
    tenant_id: zod_1.z.string(),
    document_types: zod_1.z.array(exports.DocumentTypeConfigSchema),
});
exports.DocumentProcessingStatusSchema = zod_1.z.enum([
    'pending',
    'processing',
    'completed',
    'failed',
]);
//# sourceMappingURL=documents.js.map