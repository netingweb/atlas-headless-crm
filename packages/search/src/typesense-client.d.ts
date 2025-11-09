import Typesense from 'typesense';
import type { TenantContext } from '@crm-atlas/core';
import type { EntityDefinition } from '@crm-atlas/types';
type TypesenseClient = InstanceType<typeof Typesense.Client>;
export declare function getTypesenseClient(): TypesenseClient;
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
export declare function ensureCollection(
  ctx: TenantContext,
  entity: string,
  entityDef: EntityDefinition
): Promise<void>;
export declare function upsertDocument(
  ctx: TenantContext,
  entity: string,
  doc: TypesenseDocument
): Promise<void>;
export declare function deleteDocument(
  ctx: TenantContext,
  entity: string,
  id: string
): Promise<void>;
export declare function search(
  ctx: TenantContext,
  entity: string,
  options: SearchOptions
): Promise<{
  hits: TypesenseDocument[];
  found: number;
  page: number;
}>;
export {};
//# sourceMappingURL=typesense-client.d.ts.map
