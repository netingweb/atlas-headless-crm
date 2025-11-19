import { z } from 'zod';

export const FieldTypeSchema = z.enum([
  'string',
  'number',
  'boolean',
  'date',
  'datetime',
  'email',
  'url',
  'text',
  'json',
  'reference',
]);

export type FieldType = z.infer<typeof FieldTypeSchema>;

export const FieldDefinitionSchema = z.object({
  name: z.string(),
  type: FieldTypeSchema,
  required: z.boolean().default(false),
  indexed: z.boolean().default(false),
  searchable: z.boolean().default(false),
  embeddable: z.boolean().default(false),
  reference_entity: z.string().optional(),
  default: z.unknown().optional(),
  validation: z.record(z.unknown()).optional(),
});

export type FieldDefinition = z.infer<typeof FieldDefinitionSchema>;

export const DocumentConfigSchema = z.object({
  embedding_model: z.enum(['openai', 'jina', 'local']).optional(),
  embedding_model_name: z.string().optional(),
  chunk_size: z.number().optional(),
  chunk_overlap: z.number().optional(),
  vision_enabled: z.boolean().optional(),
  vision_model: z.string().optional(),
  ocr_enabled: z.boolean().optional(),
});

export type DocumentConfig = z.infer<typeof DocumentConfigSchema>;

export const EntityDefinitionSchema = z.object({
  name: z.string(),
  fields: z.array(FieldDefinitionSchema),
  indexes: z.array(z.record(z.unknown())).optional(),
  document_config: DocumentConfigSchema.optional(),
});

export type EntityDefinition = z.infer<typeof EntityDefinitionSchema>;
