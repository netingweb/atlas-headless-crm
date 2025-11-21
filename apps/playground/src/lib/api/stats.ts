import { apiClient } from './client';

export interface EntityStats {
  name: string;
  label: string;
  total: number;
  recent: number;
  pending?: number;
  value?: number;
}

export interface StatsResponse {
  entities: EntityStats[];
}

export interface Note {
  _id: string;
  title?: string;
  content: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export const statsApi = {
  getStats: async (tenant: string, unit: string): Promise<StatsResponse> => {
    const response = await apiClient.get<StatsResponse>(`/${tenant}/${unit}/stats`);
    return response.data;
  },

  getRecentNotes: async (tenant: string, unit: string, limit = 10): Promise<Note[]> => {
    const response = await apiClient.get<Note[]>(`/${tenant}/${unit}/stats/notes/recent`, {
      params: { limit },
    });
    return response.data;
  },
};
