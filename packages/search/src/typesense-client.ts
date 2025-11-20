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
  const isGlobal = entityDef.scope === 'tenant';
  const collName = collectionName(ctx.tenant_id, isGlobal ? null : ctx.unit_id, entity, isGlobal);

  try {
    await client.collections(collName).retrieve();
  } catch {
    const schema = buildTypesenseSchema(entityDef, collName, isGlobal);
    await client.collections().create(schema);
  }
}

export async function upsertDocument(
  ctx: TenantContext,
  entity: string,
  doc: TypesenseDocument,
  entityDef?: EntityDefinition
): Promise<void> {
  const client = getTypesenseClient();
  const isGlobal = entityDef?.scope === 'tenant';
  const collName = collectionName(ctx.tenant_id, isGlobal ? null : ctx.unit_id, entity, isGlobal);
  // Be tolerant to missing/invalid fields: coerce or drop values that don't match schema
  await client.collections(collName).documents().upsert(doc, {
    dirty_values: 'coerce_or_drop',
  });
}

export async function deleteDocument(
  ctx: TenantContext,
  entity: string,
  id: string,
  entityDef?: EntityDefinition
): Promise<void> {
  const client = getTypesenseClient();
  const isGlobal = entityDef?.scope === 'tenant';
  const collName = collectionName(ctx.tenant_id, isGlobal ? null : ctx.unit_id, entity, isGlobal);
  await client.collections(collName).documents(id).delete();
}

export async function search(
  ctx: TenantContext,
  entity: string,
  options: SearchOptions,
  entityDef?: EntityDefinition
): Promise<{ hits: TypesenseDocument[]; found: number; page: number }> {
  const client = getTypesenseClient();
  // Determine if entity is global: if entityDef is provided, use its scope
  const isGlobal = entityDef?.scope === 'tenant';
  let collName: string;

  // If entityDef is provided, use it to determine collection name
  if (entityDef) {
    collName = collectionName(ctx.tenant_id, isGlobal ? null : ctx.unit_id, entity, isGlobal);
    // Verify collection exists
    try {
      await client.collections(collName).retrieve();
    } catch (error) {
      // If collection doesn't exist, try fallback
      const fallbackGlobal = collectionName(ctx.tenant_id, null, entity, true);
      const fallbackLocal = collectionName(ctx.tenant_id, ctx.unit_id, entity, false);
      try {
        await client.collections(fallbackGlobal).retrieve();
        collName = fallbackGlobal;
      } catch {
        try {
          await client.collections(fallbackLocal).retrieve();
          collName = fallbackLocal;
        } catch {
          throw new Error(
            `Typesense collection not found. Tried: ${collName}, ${fallbackGlobal}, ${fallbackLocal}. ` +
              `Please ensure the collection exists and data is indexed.`
          );
        }
      }
    }
  } else {
    // If entityDef is not provided, try global collection first (most common case)
    // This handles cases where entityDef might not be loaded but entity is global
    const globalCollName = collectionName(ctx.tenant_id, null, entity, true);
    const localCollName = collectionName(ctx.tenant_id, ctx.unit_id, entity, false);

    // Try global collection first
    try {
      await client.collections(globalCollName).retrieve();
      collName = globalCollName;
    } catch (globalError) {
      // If global collection doesn't exist, try local collection
      try {
        await client.collections(localCollName).retrieve();
        collName = localCollName;
      } catch (localError) {
        // If neither exists, throw error with helpful message
        throw new Error(
          `Typesense collection not found. Tried: ${globalCollName} and ${localCollName}. ` +
            `Please ensure the collection exists and data is indexed.`
        );
      }
    }
  }

  // Build filter_by with tenant_id (and unit_id for local entities)
  const filterParts: string[] = [];
  if (options.filter_by) {
    filterParts.push(options.filter_by);
  }

  // Always filter by tenant_id
  filterParts.push(`tenant_id:=${ctx.tenant_id}`);

  // Only filter by unit_id for local entities
  if (!isGlobal && ctx.unit_id) {
    filterParts.push(`unit_id:=${ctx.unit_id}`);
  }

  const searchParams = {
    q: options.q,
    query_by: options.query_by || '*',
    filter_by: filterParts.length > 0 ? filterParts.join(' && ') : undefined,
    facet_by: options.facet_by,
    per_page: options.per_page || 10,
    page: options.page || 1,
  };

  let result;
  try {
    result = await client.collections(collName).documents().search(searchParams);
  } catch (error) {
    // If search fails, provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Typesense search failed for collection "${collName}": ${errorMessage}. ` +
        `Query: ${options.q}, Filters: ${searchParams.filter_by || 'none'}`
    );
  }

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
  name: string,
  isGlobal = false
): TypesenseCollectionCreateSchema {
  const fields: TypesenseField[] = [
    { name: 'id', type: 'string' },
    { name: 'tenant_id', type: 'string', facet: true, optional: true },
  ];

  // Only include unit_id for local entities
  if (!isGlobal) {
    fields.push({ name: 'unit_id', type: 'string', facet: true, optional: true });
  }

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
  collectionStats?: CollectionStats[];
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
 * Get Typesense server metrics filtered by tenant (and optionally unit)
 */
export async function getTypesenseMetrics(ctx: TenantContext): Promise<TypesenseMetrics> {
  const client = getTypesenseClient();

  try {
    // Get all collections
    const allCollections = await client.collections().retrieve();

    // Filter collections by tenant
    // Collections can be:
    // - Global: {tenant_id}_{entity} (for scope: tenant)
    // - Local: {tenant_id}_{unit_id}_{entity} (for scope: unit)
    const tenantPrefix = `${ctx.tenant_id}_`;

    const filteredCollections = allCollections.filter((collection) => {
      const name = collection.name;
      // Include collections that start with tenant prefix
      // This includes both global collections (tenant-wide) and local collections (unit-specific)
      // Make sure it's an exact match (not just a substring match)
      return name.startsWith(tenantPrefix) && name.length > tenantPrefix.length;
    });

    // Count documents in filtered collections
    let totalDocuments = 0;
    const collectionStats: CollectionStats[] = [];

    for (const collection of filteredCollections) {
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
      collections: filteredCollections.length,
      documents: totalDocuments,
      collectionStats,
    };
  } catch (error) {
    throw new Error(
      `Failed to get Typesense metrics: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get collection statistics for a specific tenant
 * Includes both global collections (tenant-wide) and local collections (unit-specific)
 */
export async function getCollectionStats(ctx: TenantContext): Promise<CollectionStats[]> {
  const client = getTypesenseClient();
  const collections = await client.collections().retrieve();
  const stats: CollectionStats[] = [];

  // Filter collections by tenant
  // Collections can be:
  // - Global: {tenant_id}_{entity} (for scope: tenant)
  // - Local: {tenant_id}_{unit_id}_{entity} (for scope: unit)
  const tenantPrefix = `${ctx.tenant_id}_`;

  for (const collection of collections) {
    const name = collection.name;
    // Include all collections that belong to this tenant
    // Make sure it's an exact match (not just a substring match)
    if (name.startsWith(tenantPrefix) && name.length > tenantPrefix.length) {
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
