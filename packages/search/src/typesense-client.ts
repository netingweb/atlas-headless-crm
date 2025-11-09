import Typesense from 'typesense';
import type { TenantContext } from '@crm-atlas/core';
import { collectionName } from '@crm-atlas/utils';
import type { EntityDefinition } from '@crm-atlas/types';

const host = process.env.TYPESENSE_HOST || 'localhost';
const port = parseInt(process.env.TYPESENSE_PORT || '8108', 10);
const protocol = process.env.TYPESENSE_PROTOCOL || 'http';
const apiKey = process.env.TYPESENSE_API_KEY || 'xyz';

// Typesense types - Client is the default export
type TypesenseClient = InstanceType<typeof Typesense.Client>;
type TypesenseField = {
  name: string;
  type:
    | 'string'
    | 'int32'
    | 'int64'
    | 'float'
    | 'bool'
    | 'geopoint'
    | 'string[]'
    | 'int32[]'
    | 'int64[]'
    | 'float[]'
    | 'bool[]'
    | 'geopoint[]'
    | 'object'
    | 'object[]';
  facet?: boolean;
  optional?: boolean;
  index?: boolean;
  sort?: boolean;
  locale?: string;
  stem?: boolean;
  infix?: boolean;
  max_length?: number;
};
type TypesenseCollectionCreateSchema = {
  name: string;
  default_sorting_field?: string;
  fields?: TypesenseField[];
  symbols_to_index?: string[];
  token_separators?: string[];
  enable_nested_fields?: boolean;
};

let client: TypesenseClient | null = null;

export function getTypesenseClient(): TypesenseClient {
  if (!client) {
    client = new Typesense.Client({
      nodes: [
        {
          host,
          port,
          protocol,
        },
      ],
      apiKey,
      connectionTimeoutSeconds: 2,
    });
  }
  return client;
}

export interface TypesenseDocument {
  id: string;
  [key: string]: unknown;
}

export interface SearchOptions {
  q: string;
  query_by?: string;
  filter_by?: string;
  facet_by?: string;
  per_page?: number;
  page?: number;
}

export async function ensureCollection(
  ctx: TenantContext,
  entity: string,
  entityDef: EntityDefinition
): Promise<void> {
  const client = getTypesenseClient();
  const collName = collectionName(ctx.tenant_id, ctx.unit_id, entity);

  try {
    await client.collections(collName).retrieve();
  } catch {
    const schema = buildTypesenseSchema(entityDef, collName);
    await client.collections().create(schema);
  }
}

export async function upsertDocument(
  ctx: TenantContext,
  entity: string,
  doc: TypesenseDocument
): Promise<void> {
  const client = getTypesenseClient();
  const collName = collectionName(ctx.tenant_id, ctx.unit_id, entity);
  await client.collections(collName).documents().upsert(doc);
}

export async function deleteDocument(
  ctx: TenantContext,
  entity: string,
  id: string
): Promise<void> {
  const client = getTypesenseClient();
  const collName = collectionName(ctx.tenant_id, ctx.unit_id, entity);
  await client.collections(collName).documents(id).delete();
}

export async function search(
  ctx: TenantContext,
  entity: string,
  options: SearchOptions
): Promise<{ hits: TypesenseDocument[]; found: number; page: number }> {
  const client = getTypesenseClient();
  const collName = collectionName(ctx.tenant_id, ctx.unit_id, entity);

  const searchParams = {
    q: options.q,
    query_by: options.query_by || '*',
    filter_by: options.filter_by,
    facet_by: options.facet_by,
    per_page: options.per_page || 10,
    page: options.page || 1,
  };

  const result = await client.collections(collName).documents().search(searchParams);
  return {
    hits: (result.hits?.map((h: any) => h.document as TypesenseDocument) ||
      []) as TypesenseDocument[],
    found: result.found || 0,
    page: result.page || 1,
  };
}

function buildTypesenseSchema(
  entityDef: EntityDefinition,
  name: string
): TypesenseCollectionCreateSchema {
  const fields: TypesenseField[] = [
    { name: 'id', type: 'string' },
    { name: 'tenant_id', type: 'string', facet: true },
    { name: 'unit_id', type: 'string', facet: true },
  ];

  for (const field of entityDef.fields) {
    if (field.indexed || field.searchable) {
      const tsField: TypesenseField = {
        name: field.name,
        type: mapFieldTypeToTypesense(field.type),
      };

      if (field.searchable) {
        tsField.index = true;
      }

      if (field.type === 'string' || field.type === 'text' || field.type === 'email') {
        tsField.facet = true;
      }

      fields.push(tsField);
    }
  }

  return {
    name,
    fields,
    default_sorting_field: 'id',
  };
}

function mapFieldTypeToTypesense(fieldType: string): TypesenseField['type'] {
  switch (fieldType) {
    case 'string':
    case 'email':
    case 'url':
    case 'text':
      return 'string';
    case 'number':
      return 'int32';
    case 'boolean':
      return 'bool';
    case 'date':
      return 'int64';
    default:
      return 'string';
  }
}
