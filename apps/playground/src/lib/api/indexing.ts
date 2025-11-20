import { apiClient } from './client';

// TenantContext type definition (matching @crm-atlas/core)
export interface TenantContext {
  tenant_id: string;
  unit_id: string;
}

export interface TypesenseHealth {
  ok: boolean;
  version?: string;
  error?: string;
}

export interface IndexedCollectionDetail {
  name: string;
  entity: string | null;
  scope: 'global' | 'local' | 'unknown';
  unit_id?: string | null;
  indexed: boolean;
  numDocuments: number;
  createdAt: number | null;
  updatedAt: number | null;
}

export interface IndexingMetricsSummary {
  totalCollections: number;
  totalDocuments: number;
  global: {
    expected: number;
    indexed: number;
    documents: number;
  };
  local: {
    expected: number;
    indexed: number;
    documents: number;
  };
  unknown: {
    indexed: number;
    documents: number;
  };
}

export interface TypesenseMetricsRaw {
  collections: number;
  documents: number;
  collectionStats?: Array<{
    name: string;
    numDocuments: number;
    createdAt: number;
    updatedAt: number;
  }>;
}

export interface IndexingMetricsResponse {
  summary: IndexingMetricsSummary;
  globalCollections: IndexedCollectionDetail[];
  localCollections: IndexedCollectionDetail[];
  unknownCollections: IndexedCollectionDetail[];
  raw: TypesenseMetricsRaw;
}

export interface BackfillResponse {
  success: boolean;
  message: string;
}

export const indexingApi = {
  /**
   * Check Typesense health
   */
  async checkHealth(ctx: TenantContext): Promise<TypesenseHealth> {
    const response = await apiClient.get<TypesenseHealth>(
      `/${ctx.tenant_id}/${ctx.unit_id}/indexing/health`
    );
    return response.data;
  },

  /**
   * Get Typesense metrics
   */
  async getMetrics(ctx: TenantContext): Promise<IndexingMetricsResponse> {
    const response = await apiClient.get<IndexingMetricsResponse>(
      `/${ctx.tenant_id}/${ctx.unit_id}/indexing/metrics`
    );
    return response.data;
  },

  /**
   * Trigger backfill indexing
   */
  async triggerBackfill(ctx: TenantContext): Promise<BackfillResponse> {
    const response = await apiClient.post<BackfillResponse>(
      `/${ctx.tenant_id}/${ctx.unit_id}/indexing/backfill`
    );
    return response.data;
  },
};
