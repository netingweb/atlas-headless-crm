import { apiClient } from './client';

export interface StatsResponse {
  contacts: { total: number; recent: number };
  companies: { total: number; recent: number };
  tasks: { total: number; pending: number };
  opportunities: { total: number; value: number };
  notes: { total: number; recent: number };
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
