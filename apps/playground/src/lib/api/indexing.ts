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

export interface CollectionStats {
  name: string;
  numDocuments: number;
  createdAt: number;
  updatedAt: number;
}

export interface TypesenseMetrics {
  collections: number;
  documents: number;
  collectionStats: CollectionStats[];
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
  async getMetrics(ctx: TenantContext): Promise<TypesenseMetrics> {
    const response = await apiClient.get<TypesenseMetrics>(
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
