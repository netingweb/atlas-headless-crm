import { z } from 'zod';
export declare const FieldTypeSchema: z.ZodEnum<
  ['string', 'number', 'boolean', 'date', 'email', 'url', 'text', 'json', 'reference']
>;
export type FieldType = z.infer<typeof FieldTypeSchema>;
export declare const FieldDefinitionSchema: z.ZodObject<
  {
    name: z.ZodString;
    type: z.ZodEnum<
      ['string', 'number', 'boolean', 'date', 'email', 'url', 'text', 'json', 'reference']
    >;
    required: z.ZodDefault<z.ZodBoolean>;
    indexed: z.ZodDefault<z.ZodBoolean>;
    searchable: z.ZodDefault<z.ZodBoolean>;
    embeddable: z.ZodDefault<z.ZodBoolean>;
    reference_entity: z.ZodOptional<z.ZodString>;
    default: z.ZodOptional<z.ZodUnknown>;
    validation: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    type:
      | 'string'
      | 'number'
      | 'boolean'
      | 'date'
      | 'email'
      | 'url'
      | 'text'
      | 'json'
      | 'reference';
    name: string;
    required: boolean;
    indexed: boolean;
    searchable: boolean;
    embeddable: boolean;
    validation?: Record<string, unknown> | undefined;
    reference_entity?: string | undefined;
    default?: unknown;
  },
  {
    type:
      | 'string'
      | 'number'
      | 'boolean'
      | 'date'
      | 'email'
      | 'url'
      | 'text'
      | 'json'
      | 'reference';
    name: string;
    validation?: Record<string, unknown> | undefined;
    required?: boolean | undefined;
    indexed?: boolean | undefined;
    searchable?: boolean | undefined;
    embeddable?: boolean | undefined;
    reference_entity?: string | undefined;
    default?: unknown;
  }
>;
export type FieldDefinition = z.infer<typeof FieldDefinitionSchema>;
export declare const DocumentConfigSchema: z.ZodObject<
  {
    embedding_model: z.ZodOptional<z.ZodEnum<['openai', 'jina', 'local']>>;
    embedding_model_name: z.ZodOptional<z.ZodString>;
    chunk_size: z.ZodOptional<z.ZodNumber>;
    chunk_overlap: z.ZodOptional<z.ZodNumber>;
    vision_enabled: z.ZodOptional<z.ZodBoolean>;
    vision_model: z.ZodOptional<z.ZodString>;
    ocr_enabled: z.ZodOptional<z.ZodBoolean>;
  },
  'strip',
  z.ZodTypeAny,
  {
    embedding_model?: 'openai' | 'jina' | 'local' | undefined;
    embedding_model_name?: string | undefined;
    chunk_size?: number | undefined;
    chunk_overlap?: number | undefined;
    vision_enabled?: boolean | undefined;
    vision_model?: string | undefined;
    ocr_enabled?: boolean | undefined;
  },
  {
    embedding_model?: 'openai' | 'jina' | 'local' | undefined;
    embedding_model_name?: string | undefined;
    chunk_size?: number | undefined;
    chunk_overlap?: number | undefined;
    vision_enabled?: boolean | undefined;
    vision_model?: string | undefined;
    ocr_enabled?: boolean | undefined;
  }
>;
export type DocumentConfig = z.infer<typeof DocumentConfigSchema>;
export declare const EntityDefinitionSchema: z.ZodObject<
  {
    name: z.ZodString;
    fields: z.ZodArray<
      z.ZodObject<
        {
          name: z.ZodString;
          type: z.ZodEnum<
            ['string', 'number', 'boolean', 'date', 'email', 'url', 'text', 'json', 'reference']
          >;
          required: z.ZodDefault<z.ZodBoolean>;
          indexed: z.ZodDefault<z.ZodBoolean>;
          searchable: z.ZodDefault<z.ZodBoolean>;
          embeddable: z.ZodDefault<z.ZodBoolean>;
          reference_entity: z.ZodOptional<z.ZodString>;
          default: z.ZodOptional<z.ZodUnknown>;
          validation: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        },
        'strip',
        z.ZodTypeAny,
        {
          type:
            | 'string'
            | 'number'
            | 'boolean'
            | 'date'
            | 'email'
            | 'url'
            | 'text'
            | 'json'
            | 'reference';
          name: string;
          required: boolean;
          indexed: boolean;
          searchable: boolean;
          embeddable: boolean;
          validation?: Record<string, unknown> | undefined;
          reference_entity?: string | undefined;
          default?: unknown;
        },
        {
          type:
            | 'string'
            | 'number'
            | 'boolean'
            | 'date'
            | 'email'
            | 'url'
            | 'text'
            | 'json'
            | 'reference';
          name: string;
          validation?: Record<string, unknown> | undefined;
          required?: boolean | undefined;
          indexed?: boolean | undefined;
          searchable?: boolean | undefined;
          embeddable?: boolean | undefined;
          reference_entity?: string | undefined;
          default?: unknown;
        }
      >,
      'many'
    >;
    indexes: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, 'many'>>;
    document_config: z.ZodOptional<
      z.ZodObject<
        {
          embedding_model: z.ZodOptional<z.ZodEnum<['openai', 'jina', 'local']>>;
          embedding_model_name: z.ZodOptional<z.ZodString>;
          chunk_size: z.ZodOptional<z.ZodNumber>;
          chunk_overlap: z.ZodOptional<z.ZodNumber>;
          vision_enabled: z.ZodOptional<z.ZodBoolean>;
          vision_model: z.ZodOptional<z.ZodString>;
          ocr_enabled: z.ZodOptional<z.ZodBoolean>;
        },
        'strip',
        z.ZodTypeAny,
        {
          embedding_model?: 'openai' | 'jina' | 'local' | undefined;
          embedding_model_name?: string | undefined;
          chunk_size?: number | undefined;
          chunk_overlap?: number | undefined;
          vision_enabled?: boolean | undefined;
          vision_model?: string | undefined;
          ocr_enabled?: boolean | undefined;
        },
        {
          embedding_model?: 'openai' | 'jina' | 'local' | undefined;
          embedding_model_name?: string | undefined;
          chunk_size?: number | undefined;
          chunk_overlap?: number | undefined;
          vision_enabled?: boolean | undefined;
          vision_model?: string | undefined;
          ocr_enabled?: boolean | undefined;
        }
      >
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    name: string;
    fields: {
      type:
        | 'string'
        | 'number'
        | 'boolean'
        | 'date'
        | 'email'
        | 'url'
        | 'text'
        | 'json'
        | 'reference';
      name: string;
      required: boolean;
      indexed: boolean;
      searchable: boolean;
      embeddable: boolean;
      validation?: Record<string, unknown> | undefined;
      reference_entity?: string | undefined;
      default?: unknown;
    }[];
    indexes?: Record<string, unknown>[] | undefined;
    document_config?:
      | {
          embedding_model?: 'openai' | 'jina' | 'local' | undefined;
          embedding_model_name?: string | undefined;
          chunk_size?: number | undefined;
          chunk_overlap?: number | undefined;
          vision_enabled?: boolean | undefined;
          vision_model?: string | undefined;
          ocr_enabled?: boolean | undefined;
        }
      | undefined;
  },
  {
    name: string;
    fields: {
      type:
        | 'string'
        | 'number'
        | 'boolean'
        | 'date'
        | 'email'
        | 'url'
        | 'text'
        | 'json'
        | 'reference';
      name: string;
      validation?: Record<string, unknown> | undefined;
      required?: boolean | undefined;
      indexed?: boolean | undefined;
      searchable?: boolean | undefined;
      embeddable?: boolean | undefined;
      reference_entity?: string | undefined;
      default?: unknown;
    }[];
    indexes?: Record<string, unknown>[] | undefined;
    document_config?:
      | {
          embedding_model?: 'openai' | 'jina' | 'local' | undefined;
          embedding_model_name?: string | undefined;
          chunk_size?: number | undefined;
          chunk_overlap?: number | undefined;
          vision_enabled?: boolean | undefined;
          vision_model?: string | undefined;
          ocr_enabled?: boolean | undefined;
        }
      | undefined;
  }
>;
export type EntityDefinition = z.infer<typeof EntityDefinitionSchema>;
//# sourceMappingURL=entities.d.ts.map
