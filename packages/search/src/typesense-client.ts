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
  // Be tolerant to missing/invalid fields: coerce or drop values that don't match schema
  await client.collections(collName).documents().upsert(doc, {
    dirty_values: 'coerce_or_drop',
  });
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
    hits: (result.hits?.map((h: unknown) => {
      const hit = h as { document?: TypesenseDocument; [key: string]: unknown };
      return (hit.document || hit) as TypesenseDocument;
    }) || []) as TypesenseDocument[],
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
    { name: 'tenant_id', type: 'string', facet: true, optional: true },
    { name: 'unit_id', type: 'string', facet: true, optional: true },
  ];

  for (const field of entityDef.fields) {
    if (field.indexed || field.searchable) {
      const tsField: TypesenseField = {
        name: field.name,
        type: mapFieldTypeToTypesense(field.type),
        optional: !field.required, // Make field optional if not required in entity definition
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

  // Find a suitable default sorting field (must be numeric or date and NOT optional)
  // Typesense requires default_sorting_field to be numeric (int32, int64, float) or date and must not be optional
  const numericFields = fields.filter(
    (f) => (f.type === 'int32' || f.type === 'int64' || f.type === 'float') && !f.optional
  );
  const dateFields = fields.filter((f) => f.type === 'int64' && !f.optional); // Dates are stored as int64 timestamps

  // Prefer created_at or updated_at if available, otherwise any numeric field (must not be optional)
  const defaultSortField =
    dateFields.find((f) => f.name === 'created_at' || f.name === 'updated_at')?.name ||
    numericFields.find((f) => f.name !== 'id')?.name ||
    undefined;

  const schema: TypesenseCollectionCreateSchema = {
    name,
    fields,
  };

  // Only set default_sorting_field if we found a valid numeric/date field
  if (defaultSortField) {
    schema.default_sorting_field = defaultSortField;
  }

  return schema;
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
    case 'datetime':
      return 'int64';
    default:
      return 'string';
  }
}

export interface TypesenseHealth {
  ok: boolean;
  version?: string;
  error?: string;
}

export interface TypesenseMetrics {
  collections: number;
  documents: number;
  memoryUsage?: {
    used: number;
    total: number;
  };
  cpuUsage?: number;
}

export interface CollectionStats {
  name: string;
  numDocuments: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Check Typesense server health
 */
export async function checkTypesenseHealth(): Promise<TypesenseHealth> {
  try {
    const client = getTypesenseClient();
    const health = await client.health.retrieve();
    // Typesense health response may have version property
    const healthResponse = health as { version?: string };
    return {
      ok: true,
      version: healthResponse.version,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get Typesense server metrics
 */
export async function getTypesenseMetrics(_ctx: TenantContext): Promise<TypesenseMetrics> {
  const client = getTypesenseClient();

  try {
    // Get all collections
    const collections = await client.collections().retrieve();

    // Count documents in all collections for this tenant/unit
    let totalDocuments = 0;
    const collectionStats: CollectionStats[] = [];

    for (const collection of collections) {
      try {
        const stats = await client.collections(collection.name).retrieve();
        const statsResponse = stats as {
          num_documents?: number;
          created_at?: number;
          updated_at?: number;
        };
        const numDocs = statsResponse.num_documents || 0;
        totalDocuments += numDocs;

        collectionStats.push({
          name: collection.name,
          numDocuments: numDocs,
          createdAt: statsResponse.created_at || 0,
          updatedAt: statsResponse.updated_at || Date.now() / 1000,
        });
      } catch (error) {
        // Skip collections that can't be accessed
        console.warn(`Failed to get stats for collection ${collection.name}:`, error);
      }
    }

    return {
      collections: collections.length,
      documents: totalDocuments,
    };
  } catch (error) {
    throw new Error(
      `Failed to get Typesense metrics: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get collection statistics for a specific tenant/unit
 */
export async function getCollectionStats(ctx: TenantContext): Promise<CollectionStats[]> {
  const client = getTypesenseClient();
  const collections = await client.collections().retrieve();
  const stats: CollectionStats[] = [];

  const prefix = collectionName(ctx.tenant_id, ctx.unit_id, '');

  for (const collection of collections) {
    if (collection.name.startsWith(prefix)) {
      try {
        const collectionInfo = await client.collections(collection.name).retrieve();
        const infoResponse = collectionInfo as {
          num_documents?: number;
          created_at?: number;
          updated_at?: number;
        };
        stats.push({
          name: collection.name,
          numDocuments: infoResponse.num_documents || 0,
          createdAt: infoResponse.created_at || 0,
          updatedAt: infoResponse.updated_at || Date.now() / 1000,
        });
      } catch (error) {
        console.warn(`Failed to get stats for collection ${collection.name}:`, error);
      }
    }
  }

  return stats;
}
