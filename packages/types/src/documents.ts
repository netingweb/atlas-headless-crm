import { z } from 'zod';

/**
 * Document type configuration schema
 */
export const DocumentTypeConfigSchema = z.object({
  name: z.string(),
  display_name: z.string(),
  allowed_mime_types: z.array(z.string()),
  max_upload_size: z.number().optional(),
  embedding_config: z
    .object({
      model: z.enum(['openai', 'jina', 'local']),
      model_name: z.string().optional(),
      chunk_size: z.number().optional(),
      chunk_overlap: z.number().optional(),
    })
    .optional(),
  vision_enabled: z.boolean().optional(),
  vision_model: z.string().optional(),
  ocr_enabled: z.boolean().optional(),
});

export type DocumentTypeConfig = z.infer<typeof DocumentTypeConfigSchema>;

/**
 * Documents configuration schema (documents.json)
 */
export const DocumentsConfigSchema = z.object({
  tenant_id: z.string(),
  document_types: z.array(DocumentTypeConfigSchema),
});

export type DocumentsConfig = z.infer<typeof DocumentsConfigSchema>;

/**
 * Document processing status
 */
export const DocumentProcessingStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
]);

export type DocumentProcessingStatus = z.infer<typeof DocumentProcessingStatusSchema>;
