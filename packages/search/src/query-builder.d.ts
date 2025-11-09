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
export declare function buildTypesenseQuery(
  ctx: TenantContext,
  query: TextSearchQuery
): SearchOptions;
//# sourceMappingURL=query-builder.d.ts.map
