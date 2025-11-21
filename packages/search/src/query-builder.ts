import type { TenantContext } from '@crm-atlas/core';
import type { SearchOptions } from './typesense-client';
import type { EntityDefinition } from '@crm-atlas/types';

export interface TextSearchQuery {
  q: string;
  entity?: string;
  filters?: Record<string, unknown>;
  facets?: string[];
  per_page?: number;
  page?: number;
}

export function buildTypesenseQuery(
  ctx: TenantContext,
  query: TextSearchQuery,
  entityDef?: EntityDefinition
): SearchOptions {
  const isGlobal = entityDef?.scope === 'tenant';
  const filterParts: string[] = [`tenant_id:=${ctx.tenant_id}`];

  // Only filter by unit_id for local entities
  if (!isGlobal) {
    filterParts.push(`unit_id:=${ctx.unit_id}`);
  }

  if (query.filters) {
    for (const [key, value] of Object.entries(query.filters)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          const formattedArray = formatFilterArray(value);
          if (formattedArray) {
            filterParts.push(`${key}:=${formattedArray}`);
          }
        } else {
          filterParts.push(`${key}:=${formatFilterValue(value)}`);
        }
      }
    }
  }

  return {
    q: query.q,
    query_by: '*',
    filter_by: filterParts.join(' && '),
    facet_by: query.facets?.join(','),
    per_page: query.per_page || 10,
    page: query.page || 1,
  };
}

function formatFilterArray(values: unknown[]): string {
  const formattedValues = values
    .filter((value) => value !== undefined && value !== null)
    .map((value) => formatFilterValue(value));

  if (formattedValues.length === 0) {
    return '';
  }

  return `[${formattedValues.join(',')}]`;
}

function formatFilterValue(value: unknown): string {
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  const stringValue = String(value);
  const escaped = stringValue.replace(/"/g, '\\"');
  return `"${escaped}"`;
}
