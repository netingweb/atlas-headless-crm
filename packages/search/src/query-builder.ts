import type { TenantContext } from '@crm-atlas/core';
import type { SearchOptions } from './typesense-client';

export interface TextSearchQuery {
  q: string;
  entity?: string;
  filters?: Record<string, unknown>;
  facets?: string[];
  per_page?: number;
  page?: number;
}

export function buildTypesenseQuery(ctx: TenantContext, query: TextSearchQuery): SearchOptions {
  const filterParts: string[] = [`tenant_id:=${ctx.tenant_id}`, `unit_id:=${ctx.unit_id}`];

  if (query.filters) {
    for (const [key, value] of Object.entries(query.filters)) {
      if (value !== undefined && value !== null) {
        filterParts.push(`${key}:=${value}`);
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
