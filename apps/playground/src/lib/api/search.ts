import { apiClient } from './client';

export interface GlobalSearchRequest {
  q: string;
  limit?: number;
}

export interface GlobalSearchResult {
  entity: string;
  items: unknown[];
}

export interface TextSearchRequest {
  q: string;
  entity: string;
  per_page?: number;
  page?: number;
  filter_by?: string;
}

export interface SemanticSearchRequest {
  entity: string;
  q: string;
  limit?: number;
}

export interface HybridSearchRequest {
  q: string;
  entity: string;
  semantic_weight?: number;
  text_weight?: number;
  limit?: number;
}

export const searchApi = {
  global: async (
    tenant: string,
    unit: string,
    data: GlobalSearchRequest
  ): Promise<GlobalSearchResult[]> => {
    const response = await apiClient.post<GlobalSearchResult[]>(
      `/${tenant}/${unit}/search/global`,
      data
    );
    return response.data;
  },

  text: async (tenant: string, unit: string, data: TextSearchRequest): Promise<unknown> => {
    const response = await apiClient.post(`/${tenant}/${unit}/search/text`, data);
    return response.data;
  },

  semantic: async (
    tenant: string,
    unit: string,
    params: SemanticSearchRequest
  ): Promise<unknown> => {
    const response = await apiClient.post(`/${tenant}/${unit}/search/semantic`, {}, { params });
    return response.data;
  },

  hybrid: async (tenant: string, unit: string, data: HybridSearchRequest): Promise<unknown> => {
    const response = await apiClient.post(`/${tenant}/${unit}/search/hybrid`, data);
    return response.data;
  },
};
