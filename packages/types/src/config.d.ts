import { z } from 'zod';
export declare const StorageConfigSchema: z.ZodObject<
  {
    type: z.ZodEnum<['minio', 's3']>;
    config: z.ZodRecord<z.ZodString, z.ZodUnknown>;
  },
  'strip',
  z.ZodTypeAny,
  {
    type: 'minio' | 's3';
    config: Record<string, unknown>;
  },
  {
    type: 'minio' | 's3';
    config: Record<string, unknown>;
  }
>;
export type StorageConfig = z.infer<typeof StorageConfigSchema>;
export declare const VisionProviderSchema: z.ZodObject<
  {
    name: z.ZodEnum<['openai', 'claude']>;
    model: z.ZodOptional<z.ZodString>;
    apiKey: z.ZodOptional<z.ZodString>;
    baseUrl: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    name: 'openai' | 'claude';
    model?: string | undefined;
    apiKey?: string | undefined;
    baseUrl?: string | undefined;
  },
  {
    name: 'openai' | 'claude';
    model?: string | undefined;
    apiKey?: string | undefined;
    baseUrl?: string | undefined;
  }
>;
export type VisionProvider = z.infer<typeof VisionProviderSchema>;
export declare const DocumentProcessingConfigSchema: z.ZodObject<
  {
    maxFileSize: z.ZodOptional<z.ZodNumber>;
    allowedMimeTypes: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
    chunkingDefaults: z.ZodOptional<
      z.ZodObject<
        {
          chunkSize: z.ZodNumber;
          chunkOverlap: z.ZodNumber;
        },
        'strip',
        z.ZodTypeAny,
        {
          chunkSize: number;
          chunkOverlap: number;
        },
        {
          chunkSize: number;
          chunkOverlap: number;
        }
      >
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    maxFileSize?: number | undefined;
    allowedMimeTypes?: string[] | undefined;
    chunkingDefaults?:
      | {
          chunkSize: number;
          chunkOverlap: number;
        }
      | undefined;
  },
  {
    maxFileSize?: number | undefined;
    allowedMimeTypes?: string[] | undefined;
    chunkingDefaults?:
      | {
          chunkSize: number;
          chunkOverlap: number;
        }
      | undefined;
  }
>;
export type DocumentProcessingConfig = z.infer<typeof DocumentProcessingConfigSchema>;
export declare const TenantConfigSchema: z.ZodObject<
  {
    tenant_id: z.ZodString;
    name: z.ZodString;
    settings: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    embeddingsProvider: z.ZodOptional<
      z.ZodObject<
        {
          name: z.ZodEnum<['openai', 'jina', 'local']>;
          apiKey: z.ZodOptional<z.ZodString>;
          model: z.ZodOptional<z.ZodString>;
          baseUrl: z.ZodOptional<z.ZodString>;
        },
        'strip',
        z.ZodTypeAny,
        {
          name: 'openai' | 'jina' | 'local';
          model?: string | undefined;
          apiKey?: string | undefined;
          baseUrl?: string | undefined;
        },
        {
          name: 'openai' | 'jina' | 'local';
          model?: string | undefined;
          apiKey?: string | undefined;
          baseUrl?: string | undefined;
        }
      >
    >;
    storage: z.ZodOptional<
      z.ZodObject<
        {
          type: z.ZodEnum<['minio', 's3']>;
          config: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        },
        'strip',
        z.ZodTypeAny,
        {
          type: 'minio' | 's3';
          config: Record<string, unknown>;
        },
        {
          type: 'minio' | 's3';
          config: Record<string, unknown>;
        }
      >
    >;
    visionProvider: z.ZodOptional<
      z.ZodObject<
        {
          name: z.ZodEnum<['openai', 'claude']>;
          model: z.ZodOptional<z.ZodString>;
          apiKey: z.ZodOptional<z.ZodString>;
          baseUrl: z.ZodOptional<z.ZodString>;
        },
        'strip',
        z.ZodTypeAny,
        {
          name: 'openai' | 'claude';
          model?: string | undefined;
          apiKey?: string | undefined;
          baseUrl?: string | undefined;
        },
        {
          name: 'openai' | 'claude';
          model?: string | undefined;
          apiKey?: string | undefined;
          baseUrl?: string | undefined;
        }
      >
    >;
    documentProcessing: z.ZodOptional<
      z.ZodObject<
        {
          maxFileSize: z.ZodOptional<z.ZodNumber>;
          allowedMimeTypes: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
          chunkingDefaults: z.ZodOptional<
            z.ZodObject<
              {
                chunkSize: z.ZodNumber;
                chunkOverlap: z.ZodNumber;
              },
              'strip',
              z.ZodTypeAny,
              {
                chunkSize: number;
                chunkOverlap: number;
              },
              {
                chunkSize: number;
                chunkOverlap: number;
              }
            >
          >;
        },
        'strip',
        z.ZodTypeAny,
        {
          maxFileSize?: number | undefined;
          allowedMimeTypes?: string[] | undefined;
          chunkingDefaults?:
            | {
                chunkSize: number;
                chunkOverlap: number;
              }
            | undefined;
        },
        {
          maxFileSize?: number | undefined;
          allowedMimeTypes?: string[] | undefined;
          chunkingDefaults?:
            | {
                chunkSize: number;
                chunkOverlap: number;
              }
            | undefined;
        }
      >
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    name: string;
    tenant_id: string;
    settings?: Record<string, unknown> | undefined;
    embeddingsProvider?:
      | {
          name: 'openai' | 'jina' | 'local';
          model?: string | undefined;
          apiKey?: string | undefined;
          baseUrl?: string | undefined;
        }
      | undefined;
    storage?:
      | {
          type: 'minio' | 's3';
          config: Record<string, unknown>;
        }
      | undefined;
    visionProvider?:
      | {
          name: 'openai' | 'claude';
          model?: string | undefined;
          apiKey?: string | undefined;
          baseUrl?: string | undefined;
        }
      | undefined;
    documentProcessing?:
      | {
          maxFileSize?: number | undefined;
          allowedMimeTypes?: string[] | undefined;
          chunkingDefaults?:
            | {
                chunkSize: number;
                chunkOverlap: number;
              }
            | undefined;
        }
      | undefined;
  },
  {
    name: string;
    tenant_id: string;
    settings?: Record<string, unknown> | undefined;
    embeddingsProvider?:
      | {
          name: 'openai' | 'jina' | 'local';
          model?: string | undefined;
          apiKey?: string | undefined;
          baseUrl?: string | undefined;
        }
      | undefined;
    storage?:
      | {
          type: 'minio' | 's3';
          config: Record<string, unknown>;
        }
      | undefined;
    visionProvider?:
      | {
          name: 'openai' | 'claude';
          model?: string | undefined;
          apiKey?: string | undefined;
          baseUrl?: string | undefined;
        }
      | undefined;
    documentProcessing?:
      | {
          maxFileSize?: number | undefined;
          allowedMimeTypes?: string[] | undefined;
          chunkingDefaults?:
            | {
                chunkSize: number;
                chunkOverlap: number;
              }
            | undefined;
        }
      | undefined;
  }
>;
export type TenantConfig = z.infer<typeof TenantConfigSchema>;
export declare const UnitConfigSchema: z.ZodObject<
  {
    unit_id: z.ZodString;
    name: z.ZodString;
    tenant_id: z.ZodString;
    settings: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    name: string;
    tenant_id: string;
    unit_id: string;
    settings?: Record<string, unknown> | undefined;
  },
  {
    name: string;
    tenant_id: string;
    unit_id: string;
    settings?: Record<string, unknown> | undefined;
  }
>;
export type UnitConfig = z.infer<typeof UnitConfigSchema>;
export declare const EntitiesConfigSchema: z.ZodObject<
  {
    tenant_id: z.ZodString;
    entities: z.ZodArray<
      z.ZodObject<
        {
          name: z.ZodString;
          fields: z.ZodArray<
            z.ZodObject<
              {
                name: z.ZodString;
                type: z.ZodEnum<
                  [
                    'string',
                    'number',
                    'boolean',
                    'date',
                    'email',
                    'url',
                    'text',
                    'json',
                    'reference',
                  ]
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
      >,
      'many'
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    tenant_id: string;
    entities: {
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
    }[];
  },
  {
    tenant_id: string;
    entities: {
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
    }[];
  }
>;
export type EntitiesConfig = z.infer<typeof EntitiesConfigSchema>;
export declare const PermissionSchema: z.ZodObject<
  {
    role: z.ZodString;
    scopes: z.ZodArray<z.ZodString, 'many'>;
  },
  'strip',
  z.ZodTypeAny,
  {
    role: string;
    scopes: string[];
  },
  {
    role: string;
    scopes: string[];
  }
>;
export type Permission = z.infer<typeof PermissionSchema>;
export declare const PermissionsConfigSchema: z.ZodObject<
  {
    tenant_id: z.ZodString;
    roles: z.ZodArray<
      z.ZodObject<
        {
          role: z.ZodString;
          scopes: z.ZodArray<z.ZodString, 'many'>;
        },
        'strip',
        z.ZodTypeAny,
        {
          role: string;
          scopes: string[];
        },
        {
          role: string;
          scopes: string[];
        }
      >,
      'many'
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    tenant_id: string;
    roles: {
      role: string;
      scopes: string[];
    }[];
  },
  {
    tenant_id: string;
    roles: {
      role: string;
      scopes: string[];
    }[];
  }
>;
export type PermissionsConfig = z.infer<typeof PermissionsConfigSchema>;
//# sourceMappingURL=config.d.ts.map
