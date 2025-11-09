import { z } from 'zod';

export const FieldTypeSchema = z.enum([
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

export const EntityDefinitionSchema = z.object({
  name: z.string(),
  fields: z.array(FieldDefinitionSchema),
  indexes: z.array(z.record(z.unknown())).optional(),
});

export type EntityDefinition = z.infer<typeof EntityDefinitionSchema>;
