import { z } from 'zod';
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
          apiKey?: string | undefined;
          model?: string | undefined;
          baseUrl?: string | undefined;
        },
        {
          name: 'openai' | 'jina' | 'local';
          apiKey?: string | undefined;
          model?: string | undefined;
          baseUrl?: string | undefined;
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
          apiKey?: string | undefined;
          model?: string | undefined;
          baseUrl?: string | undefined;
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
          apiKey?: string | undefined;
          model?: string | undefined;
          baseUrl?: string | undefined;
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
                  | 'text'
                  | 'date'
                  | 'email'
                  | 'url'
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
                  | 'text'
                  | 'date'
                  | 'email'
                  | 'url'
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
              | 'text'
              | 'date'
              | 'email'
              | 'url'
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
        },
        {
          name: string;
          fields: {
            type:
              | 'string'
              | 'number'
              | 'boolean'
              | 'text'
              | 'date'
              | 'email'
              | 'url'
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
          | 'text'
          | 'date'
          | 'email'
          | 'url'
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
          | 'text'
          | 'date'
          | 'email'
          | 'url'
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
