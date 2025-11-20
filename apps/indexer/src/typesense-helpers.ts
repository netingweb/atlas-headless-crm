import type { TenantContext } from '@crm-atlas/core';
import type { EntityDefinition } from '@crm-atlas/types';
import type { TypesenseDocument } from '@crm-atlas/search';
function sanitizeSegment(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, '_');
}

export function isGlobalEntity(entityDef: EntityDefinition): boolean {
  return entityDef.scope === 'tenant';
}

export function resolveMongoCollectionName(
  tenantId: string,
  unitId: string | null,
  entity: string,
  entityDef: EntityDefinition
): string {
  if (isGlobalEntity(entityDef) || unitId === null) {
    return sanitizeSegment(`${tenantId}_${entity}`);
  }

  return sanitizeSegment(`${tenantId}_${unitId}_${entity}`);
}

export function buildTenantContext(tenantId: string, unitId: string | null): TenantContext {
  return {
    tenant_id: tenantId,
    unit_id: unitId ?? 'global',
  };
}

export function normalizeDocument(doc: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(doc)) {
    if (key === '_id') {
      continue;
    }

    if (value instanceof Date) {
      normalized[key] = Math.floor(value.getTime() / 1000);
    } else if (Array.isArray(value)) {
      normalized[key] = value.map((item) =>
        item instanceof Date ? Math.floor(item.getTime() / 1000) : item
      );
    } else {
      normalized[key] = value;
    }
  }

  return normalized;
}

export function buildTypesenseDocument(
  normalizedDoc: Record<string, unknown>,
  docId: string,
  tenantId: string,
  unitId: string | null,
  entityDef: EntityDefinition
): TypesenseDocument {
  const typesenseDoc: Record<string, unknown> = {
    id: docId,
    ...normalizedDoc,
    tenant_id: tenantId,
  };

  if (!isGlobalEntity(entityDef)) {
    typesenseDoc.unit_id = unitId;
  } else {
    delete typesenseDoc.unit_id;
  }

  return typesenseDoc as TypesenseDocument;
}

export function buildQdrantPayload(
  normalizedDoc: Record<string, unknown>,
  tenantId: string,
  unitId: string | null,
  entityDef: EntityDefinition
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    tenant_id: tenantId,
    ...normalizedDoc,
  };

  if (!isGlobalEntity(entityDef)) {
    payload.unit_id = unitId;
  } else {
    delete payload.unit_id;
  }

  return payload;
}
