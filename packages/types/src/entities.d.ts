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
>;
export type FieldDefinition = z.infer<typeof FieldDefinitionSchema>;
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
>;
export type EntityDefinition = z.infer<typeof EntityDefinitionSchema>;
//# sourceMappingURL=entities.d.ts.map
