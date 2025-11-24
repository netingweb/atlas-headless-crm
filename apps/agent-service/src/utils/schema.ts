import { z } from 'zod';

export type JsonSchema = {
  type?: string;
  description?: string;
  enum?: unknown[];
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  format?: string;
};

function buildZodType(schema: JsonSchema): z.ZodTypeAny {
  if (!schema || !schema.type) {
    return z.unknown();
  }

  switch (schema.type) {
    case 'string': {
      let stringSchema: z.ZodTypeAny = z.string();
      if (schema.enum && schema.enum.length > 0) {
        const enumValues = schema.enum as [string, ...string[]];
        stringSchema = z.enum(enumValues);
      }
      return stringSchema.describe(schema.description || '');
    }
    case 'number':
      return z.number().describe(schema.description || '');
    case 'integer':
      return z.number().int().describe(schema.description || '');
    case 'boolean':
      return z.boolean().describe(schema.description || '');
    case 'array': {
      const itemSchema = schema.items ? buildZodType(schema.items) : z.unknown();
      return z.array(itemSchema).describe(schema.description || '');
    }
    case 'object': {
      const props = schema.properties || {};
      const fields: Record<string, z.ZodTypeAny> = {};
      const required = new Set(schema.required || []);
      for (const [key, childSchema] of Object.entries(props)) {
        const child = buildZodType(childSchema);
        fields[key] = required.has(key) ? child : child.optional();
      }
      return z.object(fields).describe(schema.description || '');
    }
    default:
      return z.unknown().describe(schema.description || '');
  }
}

export function buildZodObjectFromJsonSchema(
  schema: JsonSchema
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  if (schema.type === 'object' && schema.properties) {
    return buildZodType(schema) as z.ZodObject<Record<string, z.ZodTypeAny>>;
  }

  if (!schema.properties) {
    return z.object({});
  }

  const fields: Record<string, z.ZodTypeAny> = {};
  const required = new Set(schema.required || []);
  for (const [key, childSchema] of Object.entries(schema.properties)) {
    const child = buildZodType(childSchema);
    fields[key] = required.has(key) ? child : child.optional();
  }

  return z.object(fields);
}

export function normalizeToolFilterList(values?: string[]): string[] {
  if (!values || values.length === 0) {
    return ['*'];
  }
  return Array.from(new Set(values));
}

